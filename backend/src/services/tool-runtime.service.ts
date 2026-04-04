import path from "node:path";

import { env } from "../config/env.js";
import { getUploadedFileBuffer } from "../modules/uploads/uploads.service.js";
import { TaskExecutionError } from "./llm/llm.errors.js";
import {
  bufferToGeminiFilePart,
  callGeminiGenerateContent,
  geminiAttachmentToPart,
} from "./llm/providers/gemini.shared.js";
import type { LlmProviderName } from "./llm/llm.types.js";
import type { ServiceDeliverableType } from "../modules/services/service-deliverables.js";
import type { ServiceExecutionMode } from "../modules/services/service-execution.js";

type ToolReferenceInput = {
  type: string;
  label: string;
  url: string;
  note: string | null;
  source: string | null;
  uploadId: string | null;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  previewText: string | null;
};

type RevisionRequestInput = {
  id: string;
  note: string;
  status: string;
  requestedAt: string;
};

export type ToolArtifactDraft = {
  title: string;
  fileName: string;
  contentType: string;
  content: string | Buffer;
};

export type CodeRunnerRuntimeResult = {
  summary: string | null;
  artifactDrafts: ToolArtifactDraft[];
};

export type ImageGeneratorRuntimeResult = {
  summary: string | null;
  artifactDrafts: ToolArtifactDraft[];
};

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "artifact"
  );
}

function getProviderName(providerName?: string | null): LlmProviderName {
  return providerName === "openai" ? "openai" : "gemini";
}

function getMimeExtension(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "text/plain":
      return "txt";
    case "text/markdown":
      return "md";
    case "application/json":
      return "json";
    default:
      return "bin";
  }
}

function getFileExtension(fileName: string | null) {
  return fileName ? path.extname(fileName).toLowerCase() : "";
}

function buildLatestRevisionNote(revisions: RevisionRequestInput[]) {
  const latest = [...revisions].reverse().find((revision) =>
    revision.status === "OPEN" || revision.status === "ADDRESSING",
  );

  return latest?.note ?? null;
}

function buildBestEffortFallbackGuidance(input: {
  serviceTitle: string;
  customerNote: string | null;
  deliverableType?: ServiceDeliverableType;
  executionMode?: ServiceExecutionMode;
}) {
  const intent = [input.serviceTitle, input.customerNote]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const looksLikeCompetitorResearch =
    intent.includes("competitor") ||
    intent.includes("market") ||
    intent.includes("benchmark") ||
    intent.includes("landscape");

  if (looksLikeCompetitorResearch) {
    return "If named competitors are missing, infer a narrow shortlist of plausible comparable competitors or adjacent products, label them as inferred comparables, and build a provisional comparison matrix instead of stopping.";
  }

  switch (input.deliverableType) {
    case "code":
    case "contract":
      return "If the specs are incomplete, still produce a strong starter scaffold or draft implementation with explicit assumptions and TODO markers.";
    case "data":
    case "spreadsheet":
      return "If the source material is partial, still produce a normalized schema, example output, or planning model based on the available fields and assumptions.";
    case "design":
      return "If the visual references are sparse, still produce one strong default concept direction and note the assumptions you made.";
    case "presentation":
      return "If deck materials are sparse, still produce a coherent slide outline and draft talking points.";
    case "deployment":
      return "If the product spec is incomplete, still produce a useful site map, launch structure, and deployment assumptions.";
    case "video":
    case "audio":
      return "If source assets are sparse, still produce a first-pass script, storyboard, or delivery plan.";
    case "weights":
      return "If training artifacts are missing, still produce the most useful export metadata and checkpoint handoff plan possible.";
    case "model":
      return "If geometry references are sparse, still produce a narrow asset concept, constraints, and handoff notes.";
    default:
      return "If materials are sparse, still produce the strongest useful first-pass analysis or scaffold you can from the available context, with assumptions clearly stated.";
  }
}

function isCodeExecutionUploadCandidate(reference: ToolReferenceInput) {
  if (reference.source !== "upload" || !reference.uploadId) {
    return false;
  }

  const contentType = reference.contentType?.toLowerCase() ?? "";
  const extension = getFileExtension(reference.fileName);

  return (
    contentType.startsWith("text/") ||
    [
      "application/json",
      "text/csv",
      "text/tab-separated-values",
      "application/xml",
      "text/xml",
    ].includes(contentType) ||
    [
      ".csv",
      ".tsv",
      ".txt",
      ".md",
      ".markdown",
      ".json",
      ".xml",
      ".js",
      ".ts",
      ".py",
      ".html",
      ".yaml",
      ".yml",
    ].includes(extension)
  );
}

function isReferenceImage(reference: ToolReferenceInput) {
  const contentType = reference.contentType?.toLowerCase() ?? "";
  const extension = getFileExtension(reference.fileName || reference.url);

  return (
    reference.type === "image" ||
    contentType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp"].includes(extension)
  );
}

function extractGeminiParts(body: unknown) {
  const response = getRecord(body);
  const candidates = getArray(response?.candidates);
  const firstCandidate = getRecord(candidates[0]);
  const content = getRecord(firstCandidate?.content);
  return getArray(content?.parts)
    .map((part) => getRecord(part))
    .filter((part): part is Record<string, unknown> => Boolean(part));
}

function readGeminiExecutableCode(part: Record<string, unknown>) {
  const executableCode =
    getRecord(part.executableCode) ?? getRecord(part.executable_code);

  if (!executableCode) {
    return null;
  }

  return {
    language:
      getString(executableCode.language)?.toLowerCase() ??
      "python",
    code: getString(executableCode.code),
  };
}

function readGeminiCodeExecutionResult(part: Record<string, unknown>) {
  const executionResult =
    getRecord(part.codeExecutionResult) ?? getRecord(part.code_execution_result);

  if (!executionResult) {
    return null;
  }

  return {
    outcome: getString(executionResult.outcome),
    output: getString(executionResult.output),
  };
}

function readGeminiInlineData(part: Record<string, unknown>) {
  const inlineData = getRecord(part.inlineData) ?? getRecord(part.inline_data);
  if (!inlineData) {
    return null;
  }

  const mimeType = getString(inlineData.mimeType) ?? getString(inlineData.mime_type);
  const data = getString(inlineData.data);
  if (!mimeType || !data) {
    return null;
  }

  return {
    mimeType,
    data,
  };
}

function extractOpenAiResponseErrorMessage(body: unknown) {
  const responseObject = getRecord(body);
  const errorObject = getRecord(responseObject?.error);

  return (
    getString(errorObject?.message) ??
    getString(responseObject?.message) ??
    "OpenAI image generation failed"
  );
}

async function runGeminiCodeExecution(input: {
  providerName?: string | null;
  serviceTitle: string;
  customerNote: string | null;
  references: ToolReferenceInput[];
  revisions: RevisionRequestInput[];
  deliverableType?: ServiceDeliverableType;
  executionMode?: ServiceExecutionMode;
}) {
  if (getProviderName(input.providerName) !== "gemini") {
    return null;
  }

  if (!env.GEMINI_API_KEY) {
    throw new TaskExecutionError(
      "provider_not_configured",
      "GEMINI_API_KEY is not configured for code execution",
    );
  }

  const promptSections = [
    `Analyze the structured materials for the purchased service "${input.serviceTitle}".`,
    "Use Gemini code execution when it helps with calculations, tabular analysis, transformations, or validating structured content.",
    "Work only from the provided materials. Do not browse the web or invent hidden files.",
    "Never respond that more materials are required before you can begin. If the inputs are sparse, still produce a best-effort first pass that is useful to the agent owner.",
    buildBestEffortFallbackGuidance(input),
    "Return a concise internal note for the agent owner in plain text.",
    input.customerNote ? `Customer brief: ${input.customerNote}` : null,
    buildLatestRevisionNote(input.revisions)
      ? `Latest revision request: ${buildLatestRevisionNote(input.revisions)}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const parts: Array<Record<string, unknown>> = [
    {
      text: promptSections,
    },
  ];
  let attachedMaterialCount = 0;

  for (const reference of input.references.slice(0, 4)) {
    if (isCodeExecutionUploadCandidate(reference) && reference.uploadId) {
      const uploadedFile = await getUploadedFileBuffer(reference.uploadId);
      parts.push({
        text: `Input file: ${reference.label}${reference.fileName ? ` (${reference.fileName})` : ""}`,
      });
      parts.push(
        await bufferToGeminiFilePart({
          fileName: uploadedFile.metadata.fileName,
          mimeType:
            uploadedFile.metadata.contentType ??
            reference.contentType ??
            "application/octet-stream",
          buffer: uploadedFile.buffer,
        }),
      );
      attachedMaterialCount += 1;
      continue;
    }

    if (reference.previewText) {
      parts.push({
        text: [
          `Reference: ${reference.label}`,
          reference.note ? `Note: ${reference.note}` : null,
          `Preview: ${truncate(reference.previewText, 6_000)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      attachedMaterialCount += 1;
    }
  }

  if (attachedMaterialCount === 0) {
    parts.push({
      text: "No structured upload previews were available. Work from the service title, brief, and revision context only, and produce the best useful first pass you can.",
    });
  }

  const responseBody = await callGeminiGenerateContent({
    model: env.GEMINI_CODE_EXECUTION_MODEL,
    failureMessage: "Gemini code execution failed before a response was received",
    body: {
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      tools: [{ codeExecution: {} }],
      generationConfig: {
        responseMimeType: "text/plain",
      },
    },
  });

  const responseParts = extractGeminiParts(responseBody);
  const textChunks = responseParts
    .map((part) => getString(part.text))
    .filter((value): value is string => Boolean(value));
  const codeChunks = responseParts
    .map((part) => readGeminiExecutableCode(part))
    .filter((value): value is { language: string; code: string | null } => Boolean(value?.code));
  const executionOutputs = responseParts
    .map((part) => readGeminiCodeExecutionResult(part))
    .filter((value): value is { outcome: string | null; output: string | null } => Boolean(value?.output));
  const inlineImages = responseParts
    .map((part) => readGeminiInlineData(part))
    .filter(
      (value): value is { mimeType: string; data: string } =>
        Boolean(value?.mimeType?.startsWith("image/") && value?.data),
    );

  const artifactDrafts: ToolArtifactDraft[] = [];

  if (codeChunks.length > 0) {
    artifactDrafts.push({
      title: `${input.serviceTitle} computed analysis code`,
      fileName: `${slugify(input.serviceTitle)}-analysis.py`,
      contentType: "text/plain",
      content: codeChunks
        .map((chunk, index) =>
          `# snippet ${index + 1} (${chunk.language})\n${chunk.code ?? ""}`,
        )
        .join("\n\n"),
    });
  }

  if (executionOutputs.length > 0) {
    artifactDrafts.push({
      title: `${input.serviceTitle} computed output`,
      fileName: `${slugify(input.serviceTitle)}-analysis-output.txt`,
      contentType: "text/plain",
      content: executionOutputs
        .map((chunk, index) =>
          `Execution ${index + 1}${chunk.outcome ? ` (${chunk.outcome})` : ""}\n${chunk.output ?? ""}`,
        )
        .join("\n\n"),
    });
  }

  inlineImages.forEach((image, index) => {
    artifactDrafts.push({
      title: `${input.serviceTitle} generated plot ${index + 1}`,
      fileName: `${slugify(input.serviceTitle)}-plot-${index + 1}.${getMimeExtension(image.mimeType)}`,
      contentType: image.mimeType,
      content: Buffer.from(image.data, "base64"),
    });
  });

  return {
    summary:
      truncate(textChunks.join("\n\n"), 3_500) ||
      (executionOutputs.length > 0
        ? "Gemini code execution produced structured output for this order."
        : null),
    artifactDrafts,
  } satisfies CodeRunnerRuntimeResult;
}

function buildImageGenerationPrompt(input: {
  serviceTitle: string;
  customerNote: string | null;
  references: ToolReferenceInput[];
  revisions: RevisionRequestInput[];
}) {
  const referenceNotes = input.references
    .slice(0, 4)
    .map((reference) =>
      [
        `${reference.label} (${reference.type})`,
        reference.note,
        reference.previewText ? truncate(reference.previewText, 700) : null,
      ]
        .filter(Boolean)
        .join(" - "),
    )
    .filter(Boolean);

  return [
    `Create one polished visual asset for the purchased service "${input.serviceTitle}".`,
    "Make it customer-ready and aligned with the brief.",
    "If reference images are provided, treat them as style or composition guidance.",
    "If reference images are missing, choose a strong default visual direction from the service title and customer brief instead of refusing the task.",
    "Do not add watermarks, UI chrome, or extra captions unless the brief explicitly asks for them.",
    input.customerNote ? `Customer brief: ${input.customerNote}` : null,
    buildLatestRevisionNote(input.revisions)
      ? `Latest revision request: ${buildLatestRevisionNote(input.revisions)}`
      : null,
    referenceNotes.length > 0
      ? `Reference notes:\n- ${referenceNotes.join("\n- ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function runGeminiImageGeneration(input: {
  providerName?: string | null;
  serviceTitle: string;
  customerNote: string | null;
  references: ToolReferenceInput[];
  revisions: RevisionRequestInput[];
}) {
  if (getProviderName(input.providerName) !== "gemini") {
    return null;
  }

  if (!env.GEMINI_API_KEY) {
    throw new TaskExecutionError(
      "provider_not_configured",
      "GEMINI_API_KEY is not configured for image generation",
    );
  }

  const parts: Array<Record<string, unknown>> = [
    {
      text: buildImageGenerationPrompt(input),
    },
  ];

  for (const reference of input.references.filter(isReferenceImage).slice(0, 3)) {
    if (reference.source === "upload" && reference.uploadId) {
      const uploadedFile = await getUploadedFileBuffer(reference.uploadId);
      const mimeType =
        uploadedFile.metadata.contentType ??
        reference.contentType ??
        "application/octet-stream";

      const base64Data = uploadedFile.buffer.toString("base64");
      const part = await geminiAttachmentToPart({
        type: "image",
        imageDataUrl: `data:${mimeType};base64,${base64Data}`,
        detail: "high",
      });

      if (part) {
        parts.push({
          text: `Reference image: ${reference.label}`,
        });
        parts.push(part);
      }

      continue;
    }

    const imageUrl = getString(reference.url);
    if (imageUrl) {
      const part = await geminiAttachmentToPart({
        type: "image",
        imageUrl,
        detail: "high",
      });

      if (part) {
        parts.push({
          text: `Reference image: ${reference.label}`,
        });
        parts.push(part);
      }
    }
  }

  const responseBody = await callGeminiGenerateContent({
    model: env.GEMINI_IMAGE_MODEL,
    failureMessage: "Gemini image generation failed before a response was received",
    body: {
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    },
  });

  const responseParts = extractGeminiParts(responseBody);
  const textChunks = responseParts
    .map((part) => getString(part.text))
    .filter((value): value is string => Boolean(value));
  const images = responseParts
    .map((part) => readGeminiInlineData(part))
    .filter(
      (value): value is { mimeType: string; data: string } =>
        Boolean(value?.mimeType?.startsWith("image/") && value?.data),
    );

  return {
    summary: textChunks.length > 0 ? truncate(textChunks.join("\n\n"), 2_500) : null,
    artifactDrafts: images.map((image, index) => ({
      title: `${input.serviceTitle} generated image ${index + 1}`,
      fileName: `${slugify(input.serviceTitle)}-generated-${index + 1}.${getMimeExtension(image.mimeType)}`,
      contentType: image.mimeType,
      content: Buffer.from(image.data, "base64"),
    })),
  } satisfies ImageGeneratorRuntimeResult;
}

async function runOpenAiImageGeneration(input: {
  serviceTitle: string;
  customerNote: string | null;
  references: ToolReferenceInput[];
  revisions: RevisionRequestInput[];
}) {
  if (!env.OPENAI_API_KEY) {
    throw new TaskExecutionError(
      "provider_not_configured",
      "OPENAI_API_KEY is not configured for image generation",
    );
  }

  const prompt = buildImageGenerationPrompt(input);

  let response: Response;
  try {
    response = await fetch(`${env.OPENAI_BASE_URL.replace(/\/+$/, "")}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_IMAGE_MODEL,
        prompt,
        size: "1024x1024",
        quality: "medium",
        background: "auto",
      }),
      signal: AbortSignal.timeout(Math.max(env.LLM_REQUEST_TIMEOUT_MS, 120_000)),
    });
  } catch (error) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "OpenAI image generation failed before a response was received",
      {
        message: error instanceof Error ? error.message : "Unknown fetch error",
      },
    );
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    throw new TaskExecutionError(
      "provider_request_failed",
      extractOpenAiResponseErrorMessage(responseBody),
      {
        statusCode: response.status,
        response: responseBody,
      },
    );
  }

  const responseObject = getRecord(responseBody);
  const dataEntries = getArray(responseObject?.data)
    .map((entry) => getRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  const artifactDrafts: ToolArtifactDraft[] = [];
  dataEntries.forEach((entry, index) => {
    const imageBase64 = getString(entry.b64_json);
    if (!imageBase64) {
      return;
    }

    artifactDrafts.push({
      title: `${input.serviceTitle} generated image ${index + 1}`,
      fileName: `${slugify(input.serviceTitle)}-generated-${index + 1}.png`,
      contentType: "image/png",
      content: Buffer.from(imageBase64, "base64"),
    });
  });

  return {
    summary:
      getString(dataEntries[0]?.revised_prompt) ??
      (artifactDrafts.length > 0
        ? "OpenAI generated a visual asset for this order."
        : null),
    artifactDrafts,
  } satisfies ImageGeneratorRuntimeResult;
}

export async function runGuardedCodeRunner(input: {
  providerName?: string | null;
  serviceTitle: string;
  customerNote: string | null;
  references: ToolReferenceInput[];
  revisions: RevisionRequestInput[];
  deliverableType?: ServiceDeliverableType;
  executionMode?: ServiceExecutionMode;
}) {
  return runGeminiCodeExecution(input);
}

export async function runImageGenerationTool(input: {
  providerName?: string | null;
  serviceTitle: string;
  customerNote: string | null;
  references: ToolReferenceInput[];
  revisions: RevisionRequestInput[];
}) {
  const provider = getProviderName(input.providerName);

  if (provider === "gemini") {
    return runGeminiImageGeneration(input);
  }

  return runOpenAiImageGeneration(input);
}
