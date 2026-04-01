import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import { TaskExecutionError } from "../llm.errors.js";
import type {
  LlmProvider,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResult,
} from "../llm.types.js";
import {
  callGeminiGenerateContent,
  extractGeminiResponseOutputText,
  extractGeminiUsage,
  geminiAttachmentToPart,
} from "./gemini.shared.js";

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export class GeminiResponsesProvider implements LlmProvider {
  readonly name = "gemini" as const;

  async generateStructuredOutput(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResult> {
    if (!env.GEMINI_API_KEY) {
      throw new TaskExecutionError(
        "provider_not_configured",
        "GEMINI_API_KEY is not configured for AI task execution",
      );
    }

    const model = request.model?.trim() || env.GEMINI_MODEL;
    const parts: Array<Record<string, unknown>> = [
      {
        text: request.userPrompt,
      },
    ];

    for (const attachment of request.attachments ?? []) {
      const part = await geminiAttachmentToPart(attachment);
      if (part) {
        parts.push(part);
      }
    }

    logger.info(
      {
        provider: this.name,
        model,
        schemaName: request.schemaName,
        attachmentCount: request.attachments?.length ?? 0,
      },
      "Calling Gemini structured output provider",
    );

    const responseBody = await callGeminiGenerateContent({
      model,
      failureMessage: "Gemini request failed before a response was received",
      body: {
        systemInstruction: {
          parts: [
            {
              text: request.systemPrompt,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: request.schema,
        },
      },
    });

    const rawOutputText = extractGeminiResponseOutputText(responseBody);
    if (!rawOutputText) {
      throw new TaskExecutionError(
        "malformed_output",
        "Gemini returned an empty structured output payload",
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
        "Gemini returned malformed JSON output",
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
      responseId: getString(getRecord(responseBody)?.responseId),
      rawOutputText,
      parsedOutput,
      rawResponse: responseBody,
      usage: extractGeminiUsage(responseBody),
    };
  }
}
