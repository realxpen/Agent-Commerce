import { AgentPricingModel, AgentStatus } from "@prisma/client";
import { z } from "zod";

const trimmedString = z.string().trim();

export const agentParamsSchema = z.object({
  agentId: z.string().cuid(),
});

export const createAgentBodySchema = z.object({
  name: trimmedString.min(2).max(120),
  category: trimmedString.min(2).max(80),
  description: trimmedString.min(10).max(4000),
  pricingModel: z.nativeEnum(AgentPricingModel),
  treasuryAddress: trimmedString.min(3).max(128),
  initUsername: trimmedString.min(2).max(64).optional(),
  appchainId: trimmedString.min(1).max(128).optional(),
  contractAddress: trimmedString.min(3).max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateAgentBodySchema = z
  .object({
    name: trimmedString.min(2).max(120).optional(),
    category: trimmedString.min(2).max(80).optional(),
    description: trimmedString.min(10).max(4000).optional(),
    pricingModel: z.nativeEnum(AgentPricingModel).optional(),
    treasuryAddress: trimmedString.min(3).max(128).optional(),
    initUsername: trimmedString.min(2).max(64).nullable().optional(),
    appchainId: trimmedString.min(1).max(128).nullable().optional(),
    contractAddress: trimmedString.min(3).max(128).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided for update",
  });

export const listAgentsQuerySchema = z.object({
  ownerId: z.string().cuid().optional(),
  status: z.nativeEnum(AgentStatus).optional(),
  category: trimmedString.min(2).max(80).optional(),
  pricingModel: z.nativeEnum(AgentPricingModel).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateAgentBody = z.infer<typeof createAgentBodySchema>;
export type UpdateAgentBody = z.infer<typeof updateAgentBodySchema>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;
