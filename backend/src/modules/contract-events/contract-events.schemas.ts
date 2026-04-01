import { ContractType, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const trimmedString = z.string().trim();

const decimalValueSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(\.\d+)?$/.test(value), {
    message: "Expected a valid decimal value",
  });

const bigintStringSchema = z
  .union([z.bigint(), z.number().int().nonnegative(), z.string().trim().regex(/^\d+$/)])
  .transform((value) => String(value));

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
    backendPaymentId: z.string().cuid().optional(),
    backendOrderId: z.string().cuid().optional(),
    backendAgentId: z.string().cuid().optional(),
    onchainOrderId: bigintStringSchema.optional(),
    onchainAgentId: bigintStringSchema.optional(),
    onchainServiceId: bigintStringSchema.optional(),
    paymentReference: trimmedString.min(2).max(128).optional(),
    amount: decimalValueSchema.optional(),
    platformFeeAmount: decimalValueSchema.optional(),
    agentPayoutAmount: decimalValueSchema.optional(),
    amountRefunded: decimalValueSchema.optional(),
    currency: trimmedString.min(1).max(32).optional(),
    denom: trimmedString.min(1).max(64).optional(),
    sender: trimmedString.min(3).max(128).optional(),
    recipient: trimmedString.min(3).max(128).optional(),
    customer: trimmedString.min(3).max(128).optional(),
    actor: trimmedString.min(3).max(128).optional(),
    agentTreasury: trimmedString.min(3).max(128).optional(),
    feeTreasury: trimmedString.min(3).max(128).optional(),
    deliveryRef: trimmedString.min(1).max(2048).optional(),
    previousStatus: trimmedString.min(1).max(64).optional(),
    newStatus: trimmedString.min(1).max(64).optional(),
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
