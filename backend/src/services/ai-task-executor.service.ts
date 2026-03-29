import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import type { TaskRunRecord } from "../modules/ai-tasks/ai-tasks.types.js";
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
  type NormalizedTaskOutput,
} from "./llm/prompts/index.js";
import type { ServiceFulfillmentOutput } from "./llm/prompts/service-fulfillment.prompt.js";

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

function buildPersistedOutput(
  input: {
    promptKind: string;
    provider: string;
    model: string;
    responseId: string | null;
    rawOutputText: string | null;
    rawResponse: unknown;
    usage: {
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
    } | null;
    normalizedOutput: NormalizedTaskOutput;
  },
): Prisma.InputJsonObject {
  return {
    promptKind: input.promptKind,
    provider: input.provider,
    model: input.model,
    responseId: input.responseId,
    generatedAt: new Date().toISOString(),
    usage: input.usage ? asInputJsonValue(input.usage) : null,
    raw: {
      outputText: input.rawOutputText,
      response: asInputJsonValue(input.rawResponse),
    },
    normalized: asInputJsonValue(input.normalizedOutput),
  };
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
  const prompt = buildTaskPromptDefinition(effectiveTaskRun);
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

  return {
    promptKind: prompt.promptKind,
    provider: providerResult.provider,
    model: providerResult.model,
    normalizedOutput,
    persistedOutput: buildPersistedOutput({
      promptKind: prompt.promptKind,
      provider: providerResult.provider,
      model: providerResult.model,
      responseId: providerResult.responseId,
      rawOutputText: providerResult.rawOutputText,
      rawResponse: providerResult.rawResponse,
      usage: providerResult.usage,
      normalizedOutput,
    }),
    delivery:
      prompt.promptKind === "service_fulfillment"
        ? {
            deliveryText: renderServiceFulfillmentDeliveryText(
              normalizedOutput as ServiceFulfillmentOutput,
            ),
            deliveryUrl: null,
          }
        : null,
  };
}
