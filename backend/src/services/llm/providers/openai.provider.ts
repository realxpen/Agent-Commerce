import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import { TaskExecutionError } from "../llm.errors.js";
import type {
  LlmProvider,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResult,
} from "../llm.types.js";

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

function extractResponseErrorMessage(body: unknown) {
  const responseObject = getRecord(body);
  const errorObject = getRecord(responseObject?.error);

  return (
    getString(errorObject?.message) ??
    getString(responseObject?.message) ??
    "OpenAI request failed"
  );
}

function extractResponseOutputText(body: unknown) {
  const responseObject = getRecord(body);
  const topLevelOutputText = getString(responseObject?.output_text);
  if (topLevelOutputText) {
    return topLevelOutputText;
  }

  const outputs = Array.isArray(responseObject?.output) ? responseObject.output : [];
  const chunks: string[] = [];

  for (const output of outputs) {
    const outputObject = getRecord(output);
    const contentItems = Array.isArray(outputObject?.content) ? outputObject.content : [];

    for (const content of contentItems) {
      const contentObject = getRecord(content);
      const text =
        getString(contentObject?.text) ??
        getString(contentObject?.value) ??
        getString(contentObject?.content);

      if (text) {
        chunks.push(text);
      }
    }
  }

  return chunks.length > 0 ? chunks.join("\n") : null;
}

function extractUsage(body: unknown) {
  const responseObject = getRecord(body);
  const usageObject = getRecord(responseObject?.usage);

  if (!usageObject) {
    return null;
  }

  return {
    inputTokens: getNumber(usageObject.input_tokens),
    outputTokens: getNumber(usageObject.output_tokens),
    totalTokens: getNumber(usageObject.total_tokens),
  };
}

export class OpenAiResponsesProvider implements LlmProvider {
  readonly name = "openai" as const;

  async generateStructuredOutput(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResult> {
    if (!env.OPENAI_API_KEY) {
      throw new TaskExecutionError(
        "provider_not_configured",
        "OPENAI_API_KEY is not configured for AI task execution",
      );
    }

    const model = request.model?.trim() || env.OPENAI_MODEL;
    const url = `${env.OPENAI_BASE_URL.replace(/\/+$/, "")}/responses`;

    logger.info(
      {
        provider: this.name,
        model,
        schemaName: request.schemaName,
      },
      "Calling OpenAI structured output provider",
    );

    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "system",
              content: request.systemPrompt,
            },
            {
              role: "user",
              content: request.userPrompt,
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: request.schemaName,
              schema: request.schema,
              strict: true,
            },
          },
          metadata: request.metadata,
        }),
        signal: AbortSignal.timeout(env.LLM_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new TaskExecutionError(
        "provider_request_failed",
        "OpenAI request failed before a response was received",
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

    const rawOutputText = extractResponseOutputText(responseBody);
    if (!rawOutputText) {
      throw new TaskExecutionError(
        "malformed_output",
        "OpenAI returned an empty structured output payload",
        {
          response: responseBody,
        },
      );
    }

    let parsedOutput: unknown;
    try {
      parsedOutput = JSON.parse(rawOutputText);
    } catch (error) {
      throw new TaskExecutionError(
        "malformed_output",
        "OpenAI returned malformed JSON output",
        {
          rawOutputText,
          response: responseBody,
          message: error instanceof Error ? error.message : "Invalid JSON",
        },
      );
    }

    return {
      provider: this.name,
      model,
      responseId: getString(getRecord(responseBody)?.id),
      rawOutputText,
      parsedOutput,
      rawResponse: responseBody,
      usage: extractUsage(responseBody),
    };
  }
}
