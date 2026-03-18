import { z } from "zod";

export const LLM_PROVIDER_NAMES = ["openai"] as const;
export type LlmProviderName = (typeof LLM_PROVIDER_NAMES)[number];

export const TASK_PROMPT_KINDS = [
  "service_fulfillment",
  "business_summary",
  "order_response",
] as const;

export type TaskPromptKind = (typeof TASK_PROMPT_KINDS)[number];

export type JsonSchemaObject = Record<string, unknown>;

export type LlmStructuredOutputRequest = {
  schemaName: string;
  schema: JsonSchemaObject;
  systemPrompt: string;
  userPrompt: string;
  model?: string | null;
  metadata?: Record<string, string>;
};

export type LlmStructuredOutputResult = {
  provider: LlmProviderName;
  model: string;
  responseId: string | null;
  rawOutputText: string | null;
  parsedOutput: unknown;
  rawResponse: unknown;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  } | null;
};

export interface LlmProvider {
  readonly name: LlmProviderName;
  generateStructuredOutput(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResult>;
}

const taskExecutionConfigSchema = z.object({
  promptKind: z.enum(TASK_PROMPT_KINDS).optional(),
  additionalInstructions: z.string().trim().min(1).max(4_000).optional(),
  responseSchemaVersion: z.string().trim().min(1).max(32).optional(),
});

export type TaskExecutionConfig = z.infer<typeof taskExecutionConfigSchema>;

export function parseTaskExecutionConfig(config: unknown): TaskExecutionConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }

  const parsed = taskExecutionConfigSchema.safeParse(config);
  return parsed.success ? parsed.data : {};
}
