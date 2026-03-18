import { ContractType, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const trimmedString = z.string().trim();

const decimalValueSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(\.\d+)?$/.test(value), {
    message: "Expected a valid decimal value",
  });

const blockHeightSchema = z
  .union([
    z.bigint(),
    z.number().int().nonnegative(),
    z.string().trim().regex(/^\d+$/),
  ])
  .transform((value) => BigInt(value));

const parsedPayloadSchema = z
  .object({
    paymentId: z.string().cuid().optional(),
    orderId: z.string().cuid().optional(),
    agentId: z.string().cuid().optional(),
    paymentReference: trimmedString.min(2).max(128).optional(),
    amount: decimalValueSchema.optional(),
    currency: trimmedString.min(1).max(32).optional(),
    denom: trimmedString.min(1).max(64).optional(),
    sender: trimmedString.min(3).max(128).optional(),
    recipient: trimmedString.min(3).max(128).optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
  })
  .passthrough();

export const contractEventParamsSchema = z.object({
  contractEventId: z.string().cuid(),
});

export const ingestContractEventBodySchema = z.object({
  eventKey: trimmedString.min(6).max(256).optional(),
  chainId: trimmedString.min(1).max(64),
  contractType: z.nativeEnum(ContractType).default(ContractType.UNKNOWN),
  contractAddress: trimmedString.min(3).max(128),
  txHash: trimmedString.min(3).max(256),
  blockHeight: blockHeightSchema,
  blockTimestamp: z.coerce.date().optional(),
  eventName: trimmedString.min(2).max(128),
  eventIndex: z.coerce.number().int().min(0).optional(),
  rawPayload: z.record(z.string(), z.unknown()).optional(),
  parsedPayload: parsedPayloadSchema,
});

export type IngestContractEventBody = z.infer<typeof ingestContractEventBodySchema>;
