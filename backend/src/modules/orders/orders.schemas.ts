import { OrderStatus } from "@prisma/client";
import { z } from "zod";

const trimmedString = z.string().trim();

const decimalValueSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(\.\d+)?$/.test(value), {
    message: "Expected a valid decimal value",
  });

const expectedPaymentSchema = z.object({
  chainId: trimmedString.min(1).max(64),
  amount: decimalValueSchema.optional(),
  currency: trimmedString.min(1).max(32).optional(),
  denom: trimmedString.min(1).max(64).optional(),
  payerAddress: trimmedString.min(3).max(128).optional(),
  recipientAddress: trimmedString.min(3).max(128).optional(),
  paymentReference: trimmedString.min(2).max(128).optional(),
  txHash: trimmedString.min(3).max(256).optional(),
});

const orderReferenceSchema = z.object({
  type: z.enum(["image", "video", "audio", "document", "link"]),
  label: trimmedString.min(1).max(120),
  url: z.string().trim().url().max(2048),
  note: trimmedString.min(1).max(1000).optional(),
  source: z.enum(["link", "upload"]).optional(),
  uploadId: trimmedString.min(8).max(64).optional(),
  fileName: trimmedString.min(1).max(255).optional(),
  contentType: trimmedString.min(1).max(255).optional(),
  sizeBytes: z.coerce.number().int().min(0).max(25 * 1024 * 1024).optional(),
  previewText: trimmedString.min(1).max(12000).optional(),
});

export const orderParamsSchema = z.object({
  orderId: z.string().cuid(),
});

export const customerOrdersParamsSchema = z.object({
  customerId: z.string().cuid(),
});

export const ownerOrdersParamsSchema = z.object({
  ownerId: z.string().cuid(),
});

export const createOrderBodySchema = z.object({
  agentServiceId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  customerNote: trimmedString.min(1).max(4000).optional(),
  customerReferences: z.array(orderReferenceSchema).max(8).optional(),
  paymentReference: trimmedString.min(2).max(128).optional(),
  txHash: trimmedString.min(3).max(256).optional(),
  expectedPayment: expectedPaymentSchema.optional(),
});

export const listOrdersForUserQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const listOrdersForOwnerQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  agentId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateOrderStatusBodySchema = z.object({
  status: z.nativeEnum(OrderStatus),
  finalPaidAmount: decimalValueSchema.optional(),
  paymentReference: trimmedString.min(2).max(128).optional(),
  txHash: trimmedString.min(3).max(256).optional(),
});

export const attachDeliverableBodySchema = z
  .object({
    deliveryUrl: z.string().trim().url().max(2048).optional(),
    deliveryText: trimmedString.min(1).max(20000).optional(),
  })
  .refine(
    (value) =>
      (value.deliveryUrl !== undefined && value.deliveryUrl.length > 0) ||
      (value.deliveryText !== undefined && value.deliveryText.length > 0),
    {
      message: "Provide a deliveryUrl or deliveryText",
    },
  );

export const requestOrderRevisionBodySchema = z.object({
  note: trimmedString.min(1).max(4000),
});

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type ListOrdersForUserQuery = z.infer<typeof listOrdersForUserQuerySchema>;
export type ListOrdersForOwnerQuery = z.infer<typeof listOrdersForOwnerQuerySchema>;
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusBodySchema>;
export type AttachDeliverableBody = z.infer<typeof attachDeliverableBodySchema>;
export type RequestOrderRevisionBody = z.infer<typeof requestOrderRevisionBodySchema>;
