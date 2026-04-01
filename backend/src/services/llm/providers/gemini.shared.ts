import { env } from "../../../config/env.js";
import { TaskExecutionError } from "../llm.errors.js";
import type { LlmInputAttachment } from "../llm.types.js";

export type GeminiFileRecord = {
  name: string;
  uri: string;
  mimeType: string | null;
  state: string | null;
};

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function parseDataUrl(value: string) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(value);

  if (!match) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "Gemini image attachment data URL is invalid",
    );
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

function sanitizeDisplayName(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.slice(0, 120) : `attachment-${Date.now()}`;
}

function getUploadBaseUrl() {
  const base = new URL(env.GEMINI_BASE_URL);
  return `${base.origin}/upload${base.pathname.replace(/\/+$/, "")}/files`;
}

function getResourceUrl(resourceName: string) {
  return `${env.GEMINI_BASE_URL.replace(/\/+$/, "")}/${resourceName}`;
}

function getGenerateContentUrl(model: string) {
  return `${env.GEMINI_BASE_URL.replace(/\/+$/, "")}/models/${model}:generateContent`;
}

function getGeminiTimeoutMs() {
  // Gemini file upload and structured generation can take longer than the
  // generic provider timeout, especially for multimodal fulfillment tasks.
  return Math.max(env.LLM_REQUEST_TIMEOUT_MS, 120_000);
}

function describeGeminiFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown fetch error";
  }

  const cause = "cause" in error ? (error.cause as Record<string, unknown> | null) : null;
  const causeCode = typeof cause?.code === "string" ? cause.code : null;
  const causeMessage = typeof cause?.message === "string" ? cause.message : null;
  const message = error.message?.trim() || null;

  if (error.name === "TimeoutError" || message?.toLowerCase().includes("timed out")) {
    return `Request timed out after ${getGeminiTimeoutMs()}ms`;
  }

  if (message === "fetch failed" && causeCode) {
    return `Fetch failed (${causeCode}${causeMessage ? `: ${causeMessage}` : ""})`;
  }

  return message ?? "Unknown fetch error";
}

export function extractGeminiResponseErrorMessage(body: unknown) {
  const responseObject = getRecord(body);
  const errorObject = getRecord(responseObject?.error);

  return (
    getString(errorObject?.message) ??
    getString(responseObject?.message) ??
    getString(getRecord(responseObject?.promptFeedback)?.blockReasonMessage) ??
    "Gemini request failed"
  );
}

export function extractGeminiResponseOutputText(body: unknown) {
  const responseObject = getRecord(body);
  const candidates = getArray(responseObject?.candidates);

  const chunks: string[] = [];

  for (const candidate of candidates) {
    const candidateObject = getRecord(candidate);
    const contentObject = getRecord(candidateObject?.content);
    const parts = getArray(contentObject?.parts);

    for (const part of parts) {
      const partObject = getRecord(part);
      const text = getString(partObject?.text);

      if (text) {
        chunks.push(text);
      }
    }
  }

  return chunks.length > 0 ? chunks.join("\n") : null;
}

export function extractGeminiUsage(body: unknown) {
  const usageObject = getRecord(getRecord(body)?.usageMetadata);

  if (!usageObject) {
    return null;
  }

  return {
    inputTokens: getNumber(usageObject.promptTokenCount),
    outputTokens: getNumber(usageObject.candidatesTokenCount),
    totalTokens: getNumber(usageObject.totalTokenCount),
  };
}

export async function fetchGeminiJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchRemoteGeminiAttachment(url: string) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(getGeminiTimeoutMs()),
    });
  } catch (error) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "Gemini could not fetch a remote attachment URL",
      {
        url,
        message: describeGeminiFetchError(error),
      },
    );
  }

  if (!response.ok) {
    const responseBody = await fetchGeminiJsonResponse(response);
    throw new TaskExecutionError(
      "provider_request_failed",
      `Gemini could not fetch a remote attachment URL (${response.status})`,
      {
        url,
        statusCode: response.status,
        response: responseBody,
      },
    );
  }

  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();

  return {
    mimeType,
    buffer: Buffer.from(arrayBuffer),
  };
}

async function startResumableUpload(input: {
  fileName: string | null;
  mimeType: string;
  sizeBytes: number;
}) {
  let response: Response;
  try {
    response = await fetch(getUploadBaseUrl(), {
      method: "POST",
      headers: {
        "x-goog-api-key": env.GEMINI_API_KEY ?? "",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": input.sizeBytes.toString(),
        "X-Goog-Upload-Header-Content-Type": input.mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: {
          display_name: sanitizeDisplayName(input.fileName),
        },
      }),
      signal: AbortSignal.timeout(getGeminiTimeoutMs()),
    });
  } catch (error) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "Gemini file upload could not be started",
      {
        message: describeGeminiFetchError(error),
      },
    );
  }

  if (!response.ok) {
    const responseBody = await fetchGeminiJsonResponse(response);
    throw new TaskExecutionError(
      "provider_request_failed",
      extractGeminiResponseErrorMessage(responseBody),
      {
        statusCode: response.status,
        response: responseBody,
      },
    );
  }

  const uploadUrl = response.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "Gemini file upload did not return an upload URL",
    );
  }

  return uploadUrl;
}

function toGeminiFileRecord(body: unknown): GeminiFileRecord | null {
  const responseObject = getRecord(body);
  const fileObject = getRecord(responseObject?.file) ?? responseObject;

  const name = getString(fileObject?.name);
  const uri = getString(fileObject?.uri);

  if (!name || !uri) {
    return null;
  }

  const stateObject = getRecord(fileObject?.state);

  return {
    name,
    uri,
    mimeType: getString(fileObject?.mimeType),
    state:
      getString(fileObject?.state) ??
      getString(stateObject?.name) ??
      null,
  };
}

export async function uploadBufferToGeminiFile(input: {
  fileName: string | null;
  mimeType: string;
  buffer: Buffer;
}) {
  const uploadUrl = await startResumableUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
  });

  let response: Response;
  try {
    const bodyBytes = Uint8Array.from(input.buffer.values());
    const bodyBlob = new Blob([bodyBytes], {
      type: input.mimeType,
    });

    response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": input.buffer.byteLength.toString(),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: bodyBlob,
      signal: AbortSignal.timeout(getGeminiTimeoutMs()),
    });
  } catch (error) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "Gemini file upload failed during transfer",
      {
        message: describeGeminiFetchError(error),
      },
    );
  }

  const responseBody = await fetchGeminiJsonResponse(response);
  if (!response.ok) {
    throw new TaskExecutionError(
      "provider_request_failed",
      extractGeminiResponseErrorMessage(responseBody),
      {
        statusCode: response.status,
        response: responseBody,
      },
    );
  }

  const uploadedFile = toGeminiFileRecord(responseBody);
  if (!uploadedFile) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "Gemini file upload did not return file metadata",
      {
        response: responseBody,
      },
    );
  }

  return uploadedFile;
}

async function getUploadedGeminiFile(name: string) {
  let response: Response;
  try {
    response = await fetch(getResourceUrl(name), {
      method: "GET",
      headers: {
        "x-goog-api-key": env.GEMINI_API_KEY ?? "",
      },
      signal: AbortSignal.timeout(getGeminiTimeoutMs()),
    });
  } catch (error) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "Gemini file status polling failed",
      {
        name,
        message: describeGeminiFetchError(error),
      },
    );
  }

  const responseBody = await fetchGeminiJsonResponse(response);
  if (!response.ok) {
    throw new TaskExecutionError(
      "provider_request_failed",
      extractGeminiResponseErrorMessage(responseBody),
      {
        statusCode: response.status,
        response: responseBody,
      },
    );
  }

  const uploadedFile = toGeminiFileRecord(responseBody);
  if (!uploadedFile) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "Gemini file status polling returned invalid metadata",
      {
        response: responseBody,
      },
    );
  }

  return uploadedFile;
}

export async function waitForGeminiFileReady(file: GeminiFileRecord) {
  let current = file;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!current.state || current.state === "ACTIVE") {
      return current;
    }

    if (current.state === "FAILED") {
      throw new TaskExecutionError(
        "provider_request_failed",
        "Gemini file processing failed",
        {
          file: current,
        },
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
    current = await getUploadedGeminiFile(current.name);
  }

  throw new TaskExecutionError(
    "provider_request_failed",
    "Gemini file processing timed out",
    {
      file,
    },
  );
}

export async function bufferToGeminiFilePart(input: {
  fileName: string | null;
  mimeType: string;
  buffer: Buffer;
}) {
  const uploadedFile = await waitForGeminiFileReady(
    await uploadBufferToGeminiFile(input),
  );

  return {
    fileData: {
      mimeType: uploadedFile.mimeType ?? input.mimeType,
      fileUri: uploadedFile.uri,
    },
  };
}

export async function geminiAttachmentToPart(attachment: LlmInputAttachment) {
  if (attachment.type === "image") {
    if (attachment.imageDataUrl) {
      const parsed = parseDataUrl(attachment.imageDataUrl);
      return {
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      };
    }

    if (attachment.imageUrl) {
      const remote = await fetchRemoteGeminiAttachment(attachment.imageUrl);
      return {
        inlineData: {
          mimeType: remote.mimeType,
          data: remote.buffer.toString("base64"),
        },
      };
    }

    return null;
  }

  let fileName = attachment.fileName ?? null;
  let mimeType = attachment.contentType ?? "application/octet-stream";
  let buffer: Buffer | null = null;

  if (attachment.fileData) {
    buffer = Buffer.from(attachment.fileData, "base64");
  } else if (attachment.fileUrl) {
    const remote = await fetchRemoteGeminiAttachment(attachment.fileUrl);
    buffer = remote.buffer;
    mimeType = attachment.contentType ?? remote.mimeType;
    if (!fileName) {
      try {
        const url = new URL(attachment.fileUrl);
        const pathname = url.pathname.split("/").filter(Boolean).at(-1);
        fileName = pathname ?? null;
      } catch {
        fileName = null;
      }
    }
  }

  if (!buffer) {
    return null;
  }

  return bufferToGeminiFilePart({
    fileName,
    mimeType,
    buffer,
  });
}

export async function callGeminiGenerateContent(input: {
  model: string;
  body: Record<string, unknown>;
  failureMessage: string;
}) {
  let response: Response;
  try {
    response = await fetch(getGenerateContentUrl(input.model), {
      method: "POST",
      headers: {
        "x-goog-api-key": env.GEMINI_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.body),
      signal: AbortSignal.timeout(getGeminiTimeoutMs()),
    });
  } catch (error) {
    const detail = describeGeminiFetchError(error);
    throw new TaskExecutionError(
      "provider_request_failed",
      `${input.failureMessage}: ${detail}`,
      {
        message: detail,
      },
    );
  }

  const responseBody = await fetchGeminiJsonResponse(response);

  if (!response.ok) {
    throw new TaskExecutionError(
      "provider_request_failed",
      extractGeminiResponseErrorMessage(responseBody),
      {
        statusCode: response.status,
        response: responseBody,
      },
    );
  }

  return responseBody;
}
