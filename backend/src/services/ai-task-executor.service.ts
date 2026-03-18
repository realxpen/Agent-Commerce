import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import type { TaskRunRecord } from "../modules/ai-tasks/ai-tasks.types.js";
import { TaskExecutionError } from "./llm/llm.errors.js";
import { getLlmProvider } from "./llm/provider-registry.js";
import {
  buildTaskPromptDefinition,
  type NormalizedTaskOutput,
} from "./llm/prompts/index.js";
import type { ServiceFulfillmentOutput } from "./llm/prompts/service-fulfillment.prompt.js";

function asInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
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
  const prompt = buildTaskPromptDefinition(taskRun);
  const provider = getLlmProvider(taskRun.agentTask.provider);

  const providerResult = await provider.generateStructuredOutput({
    schemaName: prompt.schemaName,
    schema: prompt.outputSchema,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    model: taskRun.agentTask.model,
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
