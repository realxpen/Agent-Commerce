import { AgentTaskType } from "@prisma/client";

import type { TaskRunRecord } from "../../../modules/ai-tasks/ai-tasks.types.js";
import { TaskExecutionError } from "../llm.errors.js";
import {
  parseTaskExecutionConfig,
  type TaskExecutionConfig,
  type TaskPromptKind,
} from "../llm.types.js";
import {
  buildBusinessSummaryPrompt,
  type BusinessSummaryOutput,
} from "./business-summary.prompt.js";
import {
  buildOrderResponsePrompt,
  type OrderResponseOutput,
} from "./order-response.prompt.js";
import {
  buildServiceFulfillmentPrompt,
  type ServiceFulfillmentOutput,
} from "./service-fulfillment.prompt.js";
import type { TaskPromptDefinition } from "./types.js";

export type NormalizedTaskOutput =
  | ServiceFulfillmentOutput
  | BusinessSummaryOutput
  | OrderResponseOutput;

function resolveDefaultPromptKind(taskRun: TaskRunRecord): TaskPromptKind {
  switch (taskRun.agentTask.type) {
    case AgentTaskType.ANALYTICS:
      return "business_summary";
    case AgentTaskType.CUSTOMER_SUPPORT:
      return "order_response";
    case AgentTaskType.ORDER_FULFILLMENT:
    case AgentTaskType.TREASURY_AUTOMATION:
    case AgentTaskType.CUSTOM:
    default:
      return "service_fulfillment";
  }
}

export function getTaskExecutionConfig(taskRun: TaskRunRecord): TaskExecutionConfig {
  const config = parseTaskExecutionConfig(taskRun.agentTask.config);
  return {
    responseSchemaVersion: config.responseSchemaVersion ?? "v1",
    ...config,
  };
}

export function buildTaskPromptDefinition(
  taskRun: TaskRunRecord,
): TaskPromptDefinition<NormalizedTaskOutput> {
  const config = getTaskExecutionConfig(taskRun);
  const promptKind = config.promptKind ?? resolveDefaultPromptKind(taskRun);
  const context = {
    taskRun,
    config,
  };

  try {
    switch (promptKind) {
      case "business_summary":
        return buildBusinessSummaryPrompt(context);
      case "order_response":
        return buildOrderResponsePrompt(context);
      case "service_fulfillment":
        return buildServiceFulfillmentPrompt(context);
      default:
        throw new TaskExecutionError("prompt_build_failed", `Unsupported prompt kind: ${promptKind}`);
    }
  } catch (error) {
    if (error instanceof TaskExecutionError) {
      throw error;
    }

    throw new TaskExecutionError(
      "prompt_build_failed",
      "Failed to build the AI prompt from task input",
      {
        promptKind,
        message: error instanceof Error ? error.message : "Unknown prompt error",
      },
    );
  }
}
