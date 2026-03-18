import { PaymentStatus } from "@prisma/client";
import { z } from "zod";

const trimmedString = z.string().trim();

const decimalValueSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(\.\d+)?$/.test(value), {
    message: "Expected a valid decimal value",
  });

export const paymentParamsSchema = z.object({
  paymentId: z.string().cuid(),
});

export const listPaymentsQuerySchema = z.object({
  ownerId: z.string().cuid().optional(),
  agentId: z.string().cuid().optional(),
  orderId: z.string().cuid().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createPaymentBodySchema = z.object({
  orderId: z.string().cuid(),
  chainId: trimmedString.min(1).max(64),
  paymentReference: trimmedString.min(2).max(128).optional(),
  txHash: trimmedString.min(3).max(256).optional(),
  amount: decimalValueSchema,
  feeAmount: decimalValueSchema.optional(),
  currency: trimmedString.min(1).max(32).optional(),
  denom: trimmedString.min(1).max(64),
  sender: trimmedString.min(3).max(128),
  recipient: trimmedString.min(3).max(128),
  status: z.nativeEnum(PaymentStatus).default(PaymentStatus.INITIATED),
  failureReason: trimmedString.min(2).max(1000).optional(),
});

export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
