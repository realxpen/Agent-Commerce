import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import type { TaskRunRecord } from "../modules/ai-tasks/ai-tasks.types.js";
import {
  getServiceExecutionContextFromTaskInput,
  type ServiceExecutionMode,
} from "../modules/services/service-execution.js";
import { createGeneratedArtifact } from "../modules/artifacts/artifacts.service.js";
import type { GeneratedArtifactDto } from "../modules/artifacts/artifacts.types.js";
import { getUploadedFileBuffer } from "../modules/uploads/uploads.service.js";
import { logger } from "../lib/logger.js";
import { TaskExecutionError } from "./llm/llm.errors.js";
import { getLlmProvider } from "./llm/provider-registry.js";
import type { LlmInputAttachment } from "./llm/llm.types.js";
import {
  supportsMediaTranscription,
  transcribeMediaBuffer,
} from "./media-transcription.service.js";
import {
  buildTaskPromptDefinition,
  getTaskExecutionConfig,
  type NormalizedTaskOutput,
} from "./llm/prompts/index.js";
import type { ServiceFulfillmentOutput } from "./llm/prompts/service-fulfillment.prompt.js";
import { executeTaskTools, type TaskToolContext } from "./task-tools.service.js";

function asInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const SUPPORTED_IMAGE_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const MULTIMODAL_ATTACHMENT_MAX_BYTES = 45 * 1024 * 1024;
const TRANSCRIPTION_PREVIEW_MAX_CHARS = 12_000;

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isHttpUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasExtension(fileName: string | null, extension: string) {
  return fileName?.toLowerCase().endsWith(extension) ?? false;
}

function isPdfReference(reference: Record<string, unknown>) {
  const contentType = getString(reference.contentType);
  const fileName = getString(reference.fileName);
  const url = getString(reference.url);

  return (
    contentType === "application/pdf" ||
    hasExtension(fileName, ".pdf") ||
    hasExtension(url, ".pdf")
  );
}

function isSupportedImageReference(reference: Record<string, unknown>) {
  const contentType = getString(reference.contentType);
  const fileName = getString(reference.fileName);
  const url = getString(reference.url);

  return (
    (contentType ? SUPPORTED_IMAGE_CONTENT_TYPES.has(contentType.toLowerCase()) : false) ||
    hasExtension(fileName, ".png") ||
    hasExtension(fileName, ".jpg") ||
    hasExtension(fileName, ".jpeg") ||
    hasExtension(fileName, ".webp") ||
    hasExtension(fileName, ".gif") ||
    hasExtension(url, ".png") ||
    hasExtension(url, ".jpg") ||
    hasExtension(url, ".jpeg") ||
    hasExtension(url, ".webp") ||
    hasExtension(url, ".gif")
  );
}

async function buildTaskRunAttachments(taskRun: TaskRunRecord) {
  const input = getRecord(taskRun.input);
  return buildTaskInputAttachments(taskRun.id, input);
}

async function buildTaskInputAttachments(taskRunId: string, input: Record<string, unknown> | null) {
  const references = Array.isArray(input?.customerReferences)
    ? input.customerReferences
    : [];

  const attachments: LlmInputAttachment[] = [];
  let totalBytes = 0;

  for (const entry of references) {
    const reference = getRecord(entry);
    if (!reference) {
      continue;
    }

    const uploadId = getString(reference.uploadId);
    const source = getString(reference.source);
    const url = getString(reference.url);
    const estimatedSizeBytes = getNumber(reference.sizeBytes) ?? 0;

    if (isSupportedImageReference(reference)) {
      if (source === "upload" && uploadId) {
        try {
          const uploadedFile = await getUploadedFileBuffer(uploadId);
          if (
            !uploadedFile.metadata.contentType ||
            !SUPPORTED_IMAGE_CONTENT_TYPES.has(
              uploadedFile.metadata.contentType.toLowerCase(),
            )
          ) {
            continue;
          }

          if (totalBytes + uploadedFile.metadata.sizeBytes > MULTIMODAL_ATTACHMENT_MAX_BYTES) {
            continue;
          }

          totalBytes += uploadedFile.metadata.sizeBytes;
          attachments.push({
            type: "image",
            imageDataUrl: `data:${uploadedFile.metadata.contentType};base64,${uploadedFile.buffer.toString("base64")}`,
            detail: "high",
          });
        } catch (error) {
          logger.warn(
            {
              err: error,
              taskRunId,
              uploadId,
            },
            "Skipping uploaded image reference that could not be loaded",
          );
        }

        continue;
      }

      if (isHttpUrl(url)) {
        attachments.push({
          type: "image",
          imageUrl: url ?? undefined,
          detail: "high",
        });
      }

      continue;
    }

    if (!isPdfReference(reference)) {
      continue;
    }

    if (source === "upload" && uploadId) {
      try {
        const uploadedFile = await getUploadedFileBuffer(uploadId);
        const contentType = uploadedFile.metadata.contentType ?? "application/pdf";
        if (contentType !== "application/pdf") {
          continue;
        }

        if (totalBytes + uploadedFile.metadata.sizeBytes > MULTIMODAL_ATTACHMENT_MAX_BYTES) {
          continue;
        }

        totalBytes += uploadedFile.metadata.sizeBytes;
        attachments.push({
          type: "file",
          fileData: uploadedFile.buffer.toString("base64"),
          fileName: uploadedFile.metadata.fileName,
          contentType,
        });
      } catch (error) {
          logger.warn(
            {
              err: error,
              taskRunId,
              uploadId,
            },
            "Skipping uploaded PDF reference that could not be loaded",
        );
      }

      continue;
    }

    if (
      isHttpUrl(url) &&
      totalBytes + estimatedSizeBytes <= MULTIMODAL_ATTACHMENT_MAX_BYTES
    ) {
      totalBytes += estimatedSizeBytes;
      attachments.push({
        type: "file",
        fileUrl: url ?? undefined,
        fileName: getString(reference.fileName),
        contentType: getString(reference.contentType) ?? "application/pdf",
      });
    }
  }

  return attachments;
}

async function enrichTaskInputWithMediaTranscripts(taskRun: TaskRunRecord) {
  const input = getRecord(taskRun.input);
  if (!input) {
    return taskRun.input;
  }

  const references = Array.isArray(input.customerReferences)
    ? input.customerReferences
    : null;

  if (!references || references.length === 0) {
    return taskRun.input;
  }

  let changed = false;
  const enrichedReferences = await Promise.all(
    references.map(async (entry) => {
      const reference = getRecord(entry);
      if (!reference) {
        return entry;
      }

      const existingPreviewText = getString(reference.previewText);
      if (existingPreviewText) {
        return entry;
      }

      const source = getString(reference.source);
      const uploadId = getString(reference.uploadId);
      const fileName = getString(reference.fileName) ?? getString(reference.label) ?? "upload";
      const contentType = getString(reference.contentType);

      if (
        source !== "upload" ||
        !uploadId ||
        !supportsMediaTranscription(fileName, contentType)
      ) {
        return entry;
      }

      try {
        const uploadedFile = await getUploadedFileBuffer(uploadId);
        if (
          !supportsMediaTranscription(
            uploadedFile.metadata.fileName,
            uploadedFile.metadata.contentType,
          )
        ) {
          return entry;
        }

        const transcript = await transcribeMediaBuffer({
          buffer: uploadedFile.buffer,
          fileName: uploadedFile.metadata.fileName,
          contentType: uploadedFile.metadata.contentType,
        });

        changed = true;

        return {
          ...reference,
          previewText: transcript.slice(0, TRANSCRIPTION_PREVIEW_MAX_CHARS),
        };
      } catch (error) {
        logger.warn(
          {
            err: error,
            taskRunId: taskRun.id,
            uploadId,
          },
          "Skipping media transcription for uploaded reference",
        );

        return entry;
      }
    }),
  );

  if (!changed) {
    return taskRun.input;
  }

  return {
    ...input,
    customerReferences: enrichedReferences,
  };
}

function renderServiceFulfillmentDeliveryText(output: ServiceFulfillmentOutput) {
  const artifactSections = output.artifacts
    .map((artifact) => `## ${artifact.title}\n\n${artifact.content}`)
    .join("\n\n");

  const followUpQuestions =
    output.followUpQuestions.length > 0
      ? `## Follow-up Questions\n\n${output.followUpQuestions
          .map((question) => `- ${question}`)
          .join("\n")}`
      : null;

  return [
    `# ${output.deliveryTitle}`,
    output.summary,
    output.deliveryText,
    artifactSections || null,
    `## Customer Message\n\n${output.customerMessage}`,
    followUpQuestions,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildManualFulfillmentOutput(
  taskRun: TaskRunRecord,
  executionMode: ServiceExecutionMode,
): ServiceFulfillmentOutput {
  const serviceTitle =
    typeof taskRun.order?.serviceTitleSnapshot === "string" &&
    taskRun.order.serviceTitleSnapshot.length > 0
      ? taskRun.order.serviceTitleSnapshot
      : taskRun.agentTask.name;

  const reviewMessage =
    executionMode === "hybrid_ai_plus_owner_review"
      ? "An internal AI draft may still be attached to this task run, but the final delivery should be reviewed and submitted by the owner."
      : "This service is configured for manual owner delivery, so no automatic AI output was sent to the customer.";

  return {
    summary: `Manual fulfillment handoff created for ${serviceTitle}.`,
    deliveryTitle: `${serviceTitle} manual fulfillment handoff`,
    deliveryText: [
      `This order uses the ${executionMode} flow.`,
      "Customer payment is secured, and the agent owner should continue the work manually from the order page.",
      reviewMessage,
    ].join(" "),
    customerMessage:
      "The order is now in the owner fulfillment queue. The final delivery will be attached manually.",
    artifacts: [],
    followUpQuestions: [],
  };
}

function buildPersistedOutput(
  input: {
    promptKind: string;
    provider: string;
    model: string;
    executionMode: ServiceExecutionMode;
    ownerReviewRequired: boolean;
    responseId: string | null;
    rawOutputText: string | null;
    rawResponse: unknown;
    usage: {
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
    } | null;
    toolContext: TaskToolContext | null;
    generatedArtifacts: GeneratedArtifactDto[];
    normalizedOutput: NormalizedTaskOutput;
  },
): Prisma.InputJsonObject {
  return {
    promptKind: input.promptKind,
    provider: input.provider,
    model: input.model,
    executionMode: input.executionMode,
    ownerReviewRequired: input.ownerReviewRequired,
    responseId: input.responseId,
    generatedAt: new Date().toISOString(),
    usage: input.usage ? asInputJsonValue(input.usage) : null,
    toolContext: input.toolContext ? asInputJsonValue(input.toolContext) : null,
    generatedArtifacts: asInputJsonValue(input.generatedArtifacts),
    raw: {
      outputText: input.rawOutputText,
      response: asInputJsonValue(input.rawResponse),
    },
    normalized: asInputJsonValue(input.normalizedOutput),
  };
}

function getGeneratedArtifactContentType(kind: "text" | "markdown" | "json") {
  switch (kind) {
    case "json":
      return "application/json";
    case "markdown":
      return "text/markdown";
    case "text":
    default:
      return "text/plain";
  }
}

function getGeneratedArtifactFileName(title: string, kind: "text" | "markdown" | "json") {
  const safeTitle =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "artifact";

  switch (kind) {
    case "json":
      return `${safeTitle}.json`;
    case "markdown":
      return `${safeTitle}.md`;
    case "text":
    default:
      return `${safeTitle}.txt`;
  }
}

async function persistStructuredOutputArtifacts(
  taskRun: TaskRunRecord,
  normalizedOutput: ServiceFulfillmentOutput,
) {
  return Promise.all(
    normalizedOutput.artifacts.map((artifact) =>
      createGeneratedArtifact({
        taskRunId: taskRun.id,
        orderId: taskRun.orderId,
        title: artifact.title,
        fileName: getGeneratedArtifactFileName(artifact.title, artifact.kind),
        contentType: getGeneratedArtifactContentType(artifact.kind),
        content: artifact.kind === "json"
          ? (() => {
              try {
                return JSON.stringify(JSON.parse(artifact.content), null, 2);
              } catch {
                return artifact.content;
              }
            })()
          : artifact.content,
        source: "llm",
      }),
    ),
  );
}

function buildGeneratedArtifactLinksSection(
  title: string,
  artifacts: GeneratedArtifactDto[],
) {
  if (artifacts.length === 0) {
    return null;
  }

  return [
    `## ${title}`,
    "",
    ...artifacts.map(
      (artifact) =>
        `- [${artifact.title}](${artifact.url}) (${artifact.fileName}, ${artifact.contentType})`,
    ),
  ].join("\n");
}

function buildToolResultSection(toolContext: TaskToolContext | null) {
  if (!toolContext || toolContext.results.length === 0) {
    return null;
  }

  return [
    "## Tool Runner Notes",
    "",
    ...toolContext.results.map((result) =>
      [
        `### ${result.title}`,
        "",
        result.summary,
        result.url ? `Source: ${result.url}` : null,
        result.artifactUrl ? `Artifact: ${result.artifactUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n\n");
}

function buildDeliveryBundleContent(input: {
  output: ServiceFulfillmentOutput;
  toolContext: TaskToolContext | null;
  bundleArtifacts: GeneratedArtifactDto[];
}) {
  return [
    `# ${input.output.deliveryTitle}`,
    input.output.summary,
    input.output.deliveryText,
    buildGeneratedArtifactLinksSection("Downloadable Artifacts", input.bundleArtifacts),
    buildToolResultSection(input.toolContext),
    `## Customer Message\n\n${input.output.customerMessage}`,
    input.output.followUpQuestions.length > 0
      ? `## Follow-up Questions\n\n${input.output.followUpQuestions
          .map((question) => `- ${question}`)
          .join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function executeTaskRunWithLlm(taskRun: TaskRunRecord) {
  const enrichedInput = await enrichTaskInputWithMediaTranscripts(taskRun);
  const effectiveTaskRun =
    enrichedInput === taskRun.input
      ? taskRun
      : ({
          ...taskRun,
          input: enrichedInput,
        } satisfies TaskRunRecord);
  const execution = getServiceExecutionContextFromTaskInput(enrichedInput);
  const taskConfig = getTaskExecutionConfig(effectiveTaskRun);
  const toolContext = await executeTaskTools({
    taskRun: effectiveTaskRun,
    config: taskConfig,
  });

  if (!execution.usesLlm) {
    const normalizedOutput = buildManualFulfillmentOutput(
      effectiveTaskRun,
      execution.mode,
    );

    return {
      promptKind: "service_fulfillment",
      provider: "manual",
      model: execution.mode,
      executionMode: execution.mode,
      ownerReviewRequired: execution.ownerReviewRequired,
      normalizedOutput,
      persistedOutput: buildPersistedOutput({
        promptKind: "service_fulfillment",
        provider: "manual",
        model: execution.mode,
        executionMode: execution.mode,
        ownerReviewRequired: execution.ownerReviewRequired,
        responseId: null,
        rawOutputText: null,
        toolContext,
        generatedArtifacts: toolContext?.artifacts ?? [],
        rawResponse: {
          mode: execution.mode,
          handoff: "manual_owner_delivery",
        },
        usage: null,
        normalizedOutput,
      }),
      delivery: null,
    };
  }

  const promptTaskRun =
    toolContext || getRecord(enrichedInput)
      ? ({
          ...effectiveTaskRun,
          input: {
            ...(getRecord(enrichedInput) ?? {}),
            ...(toolContext
              ? {
                  toolContext,
                }
              : {}),
          },
        } satisfies TaskRunRecord)
      : effectiveTaskRun;

  const prompt = buildTaskPromptDefinition(promptTaskRun);
  const provider = getLlmProvider(taskRun.agentTask.provider);
  const attachments = await buildTaskInputAttachments(
    taskRun.id,
    getRecord(enrichedInput),
  );

  const providerResult = await provider.generateStructuredOutput({
    schemaName: prompt.schemaName,
    schema: prompt.outputSchema,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    model: taskRun.agentTask.model,
    attachments,
    metadata: {
      taskRunId: taskRun.id,
      agentTaskId: taskRun.agentTaskId,
      ...(taskRun.orderId
        ? {
            orderId: taskRun.orderId,
          }
        : {}),
    },
  });

  let normalizedOutput: NormalizedTaskOutput;
  try {
    normalizedOutput = prompt.validate(providerResult.parsedOutput);
  } catch (error) {
    throw new TaskExecutionError(
      "malformed_output",
      "Structured LLM output failed application validation",
      {
        promptKind: prompt.promptKind,
        rawOutputText: providerResult.rawOutputText,
        response: providerResult.rawResponse,
        issues:
          error instanceof ZodError
            ? error.flatten()
            : error instanceof Error
              ? error.message
              : "Unknown validation error",
      },
    );
  }

  const llmArtifacts =
    prompt.promptKind === "service_fulfillment"
      ? await persistStructuredOutputArtifacts(
          effectiveTaskRun,
          normalizedOutput as ServiceFulfillmentOutput,
        )
      : [];
  const persistedArtifacts = [...(toolContext?.artifacts ?? []), ...llmArtifacts];
  const deliveryBundleArtifact =
    prompt.promptKind === "service_fulfillment"
      ? await createGeneratedArtifact({
          taskRunId: effectiveTaskRun.id,
          orderId: effectiveTaskRun.orderId,
          title: `${(normalizedOutput as ServiceFulfillmentOutput).deliveryTitle} bundle`,
          fileName: getGeneratedArtifactFileName(
            `${(normalizedOutput as ServiceFulfillmentOutput).deliveryTitle} bundle`,
            "markdown",
          ),
          contentType: "text/markdown",
          content: buildDeliveryBundleContent({
            output: normalizedOutput as ServiceFulfillmentOutput,
            toolContext,
            bundleArtifacts: persistedArtifacts,
          }),
          source: "delivery_bundle",
        })
      : null;
  const generatedArtifacts = deliveryBundleArtifact
    ? [...persistedArtifacts, deliveryBundleArtifact]
    : persistedArtifacts;

  return {
    promptKind: prompt.promptKind,
    provider: providerResult.provider,
    model: providerResult.model,
    executionMode: execution.mode,
    ownerReviewRequired: execution.ownerReviewRequired,
    normalizedOutput,
    persistedOutput: buildPersistedOutput({
      promptKind: prompt.promptKind,
      provider: providerResult.provider,
      model: providerResult.model,
      executionMode: execution.mode,
      ownerReviewRequired: execution.ownerReviewRequired,
      toolContext,
      generatedArtifacts,
      responseId: providerResult.responseId,
      rawOutputText: providerResult.rawOutputText,
      rawResponse: providerResult.rawResponse,
      usage: providerResult.usage,
      normalizedOutput,
    }),
    delivery:
      prompt.promptKind === "service_fulfillment" && execution.autoDelivery
        ? {
            deliveryText: renderServiceFulfillmentDeliveryText(
              normalizedOutput as ServiceFulfillmentOutput,
            ),
            deliveryUrl: deliveryBundleArtifact?.url ?? null,
          }
        : null,
  };
}
