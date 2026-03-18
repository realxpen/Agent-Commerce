import { z } from "zod";
import { TaskRunStatus } from "@prisma/client";

import { LLM_PROVIDER_NAMES, TASK_PROMPT_KINDS } from "../../services/llm/llm.types.js";

export const orderTaskParamsSchema = z.object({
  orderId: z.string().cuid(),
});

export const taskRunParamsSchema = z.object({
  taskRunId: z.string().trim().min(10).max(64),
});

export const triggerTaskProcessingBodySchema = z.object({
  force: z.coerce.boolean().optional().default(false),
  provider: z.enum(LLM_PROVIDER_NAMES).optional(),
  model: z.string().trim().min(1).max(128).optional(),
  promptKind: z.enum(TASK_PROMPT_KINDS).optional(),
  additionalInstructions: z.string().trim().min(1).max(4_000).optional(),
});

export const listTaskRunsQuerySchema = z.object({
  ownerId: z.string().cuid().optional(),
  agentId: z.string().cuid().optional(),
  orderId: z.string().cuid().optional(),
  status: z.nativeEnum(TaskRunStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type TriggerTaskProcessingBody = z.infer<typeof triggerTaskProcessingBodySchema>;
export type ListTaskRunsQuery = z.infer<typeof listTaskRunsQuerySchema>;
