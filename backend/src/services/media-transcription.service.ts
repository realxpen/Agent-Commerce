import { env } from "../config/env.js";
import { TaskExecutionError } from "./llm/llm.errors.js";

const SUPPORTED_TRANSCRIPTION_CONTENT_TYPES = new Set([
  "audio/flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/mpga",
  "audio/m4a",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
]);

const SUPPORTED_TRANSCRIPTION_EXTENSIONS = new Set([
  ".flac",
  ".mp3",
  ".mp4",
  ".mpeg",
  ".mpga",
  ".m4a",
  ".ogg",
  ".wav",
  ".webm",
]);

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractResponseErrorMessage(body: unknown) {
  const responseObject = getRecord(body);
  const errorObject = getRecord(responseObject?.error);

  return (
    getString(errorObject?.message) ??
    getString(responseObject?.message) ??
    "OpenAI transcription request failed"
  );
}

export function supportsMediaTranscription(fileName: string, contentType: string | null) {
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
    : "";

  return (
    (contentType ? SUPPORTED_TRANSCRIPTION_CONTENT_TYPES.has(contentType.toLowerCase()) : false) ||
    SUPPORTED_TRANSCRIPTION_EXTENSIONS.has(extension)
  );
}

export async function transcribeMediaBuffer(input: {
  buffer: Buffer;
  fileName: string;
  contentType: string | null;
}) {
  if (!env.OPENAI_API_KEY) {
    throw new TaskExecutionError(
      "provider_not_configured",
      "OPENAI_API_KEY is not configured for media transcription",
    );
  }

  const url = `${env.OPENAI_BASE_URL.replace(/\/+$/, "")}/audio/transcriptions`;
  const formData = new FormData();
  const fileBytes = new Uint8Array(input.buffer.byteLength);
  fileBytes.set(input.buffer);
  const file = new File([fileBytes], input.fileName, {
    type: input.contentType ?? "application/octet-stream",
  });

  formData.set("file", file);
  formData.set("model", env.OPENAI_TRANSCRIPTION_MODEL);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: formData,
      signal: AbortSignal.timeout(env.LLM_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new TaskExecutionError(
      "provider_request_failed",
      "OpenAI transcription request failed before a response was received",
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
      extractResponseErrorMessage(responseBody),
      {
        statusCode: response.status,
        response: responseBody,
      },
    );
  }

  const text = getString(getRecord(responseBody)?.text)?.trim() ?? null;
  if (!text) {
    throw new TaskExecutionError(
      "malformed_output",
      "OpenAI transcription response did not include text",
      {
        response: responseBody,
      },
    );
  }

  return text;
}
