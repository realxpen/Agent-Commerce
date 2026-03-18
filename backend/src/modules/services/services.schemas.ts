import { AgentServiceStatus } from "@prisma/client";
import { z } from "zod";

const trimmedString = z.string().trim();

export const agentParamsSchema = z.object({
  agentId: trimmedString.cuid(),
});

export const serviceParamsSchema = z.object({
  serviceId: trimmedString.cuid(),
});

export const listServicesQuerySchema = z.object({
  agentId: trimmedString.cuid().optional(),
  ownerId: trimmedString.cuid().optional(),
  status: z.nativeEnum(AgentServiceStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const createServiceBodySchema = z.object({
  title: trimmedString.min(2).max(160),
  description: trimmedString.min(10).max(4000),
  priceAmount: trimmedString.regex(/^\d+(\.\d+)?$/, "priceAmount must be a numeric string"),
  priceCurrency: trimmedString.max(32).optional(),
  priceDenom: trimmedString.min(1).max(64),
  estimatedDeliveryMinutes: z.coerce.number().int().min(1).max(60 * 24 * 30).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateServiceBodySchema = z
  .object({
    title: trimmedString.min(2).max(160).optional(),
    description: trimmedString.min(10).max(4000).optional(),
    priceAmount: trimmedString
      .regex(/^\d+(\.\d+)?$/, "priceAmount must be a numeric string")
      .optional(),
    priceCurrency: trimmedString.max(32).nullable().optional(),
    priceDenom: trimmedString.min(1).max(64).optional(),
    estimatedDeliveryMinutes: z.coerce.number().int().min(1).max(60 * 24 * 30).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    "Provide at least one service field to update",
  );

export type AgentParams = z.infer<typeof agentParamsSchema>;
export type ServiceParams = z.infer<typeof serviceParamsSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type CreateServiceBody = z.infer<typeof createServiceBodySchema>;
export type UpdateServiceBody = z.infer<typeof updateServiceBodySchema>;
