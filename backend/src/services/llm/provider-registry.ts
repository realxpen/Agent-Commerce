import { env } from "../../config/env.js";
import { TaskExecutionError } from "./llm.errors.js";
import { GeminiResponsesProvider } from "./providers/gemini.provider.js";
import { OpenAiResponsesProvider } from "./providers/openai.provider.js";
import type { LlmProvider, LlmProviderName } from "./llm.types.js";

export function getLlmProvider(providerName?: string | null): LlmProvider {
  const resolvedProvider = providerName?.trim() || env.LLM_PROVIDER;

  switch (resolvedProvider) {
    case "openai":
      return new OpenAiResponsesProvider();
    case "gemini":
      return new GeminiResponsesProvider();
    default:
      throw new TaskExecutionError(
        "unsupported_provider",
        `Unsupported LLM provider: ${resolvedProvider}`,
        {
          provider: resolvedProvider as LlmProviderName | string,
        },
      );
  }
}
