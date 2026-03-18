import { Prisma, type PrismaClient } from "@prisma/client";

import type { AppQueues } from "../../queues/index.js";
import { maybeTriggerTaskProcessingForOrder } from "../ai-tasks/task.service.js";
import type { CreatePaymentBody, ListPaymentsQuery } from "./payments.schemas.js";
import {
  buildPaymentWriteData,
  findExistingPaymentForCreate,
  findOrderForPaymentCreate,
  findPaymentOrThrow,
  createPaymentRecord,
  syncOrderFromPaymentStatus,
} from "./payments.repository.js";
import type { PaymentDto, PaymentListDto, PaymentRecord } from "./payments.types.js";
import { createHttpError } from "../../utils/http-error.js";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toPaymentDto(payment: PaymentRecord): PaymentDto {
  return {
    id: payment.id,
    orderId: payment.orderId,
    agentId: payment.agentId,
    chainId: payment.chainId,
    paymentReference: payment.paymentReference,
    txHash: payment.txHash,
    amount: payment.amount.toString(),
    feeAmount: payment.feeAmount.toString(),
    currency: payment.currency,
    denom: payment.denom,
    sender: payment.payerAddress,
    recipient: payment.recipientAddress,
    status: payment.status,
    confirmationStatus: payment.confirmationStatus,
    confirmationCount: payment.confirmationCount,
    blockHeight: payment.blockHeight?.toString() ?? null,
    confirmedAt: toIsoString(payment.confirmedAt),
    finalizedAt: toIsoString(payment.finalizedAt),
    failureReason: payment.failureReason,
    order: {
      id: payment.order.id,
      customerId: payment.order.customerId,
      status: payment.order.status,
      paymentStatus: payment.order.paymentStatus,
      serviceTitle: payment.order.serviceTitleSnapshot,
      paymentReference: payment.order.paymentReference,
      txHash: payment.order.txHash,
    },
    agent: {
      id: payment.agent.id,
      ownerId: payment.agent.ownerId,
      name: payment.agent.name,
      slug: payment.agent.slug,
      treasuryAddress: payment.agent.treasuryAddress,
    },
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export async function createPayment(
  db: PrismaClient,
  queues: AppQueues,
  input: CreatePaymentBody,
): Promise<PaymentDto> {
  const payment = await db.$transaction(async (tx): Promise<PaymentRecord> => {
    const order = await findOrderForPaymentCreate(tx, input.orderId);

    if (!order) {
      throw createHttpError(404, "Order not found");
    }

    const existingPayment = await findExistingPaymentForCreate(tx, {
      orderId: input.orderId,
      paymentReference: input.paymentReference ?? null,
      txHash: input.txHash ?? null,
    });

    if (existingPayment) {
      return existingPayment;
    }

    if (input.recipient !== order.agent.treasuryAddress) {
      throw createHttpError(409, "Payment recipient must match the agent treasury address");
    }

    const paymentRecord = await createPaymentRecord(
      tx,
      buildPaymentWriteData({
        orderId: order.id,
        agentId: order.agentId,
        chainId: input.chainId,
        paymentReference: input.paymentReference ?? null,
        txHash: input.txHash ?? null,
        amount: new Prisma.Decimal(input.amount),
        feeAmount:
          input.feeAmount !== undefined ? new Prisma.Decimal(input.feeAmount) : undefined,
        currency: input.currency ?? order.currency ?? null,
        denom: input.denom,
        payerAddress: input.sender,
        recipientAddress: input.recipient,
        status: input.status,
        failureReason: input.failureReason ?? null,
      }),
    );

    await syncOrderFromPaymentStatus(tx, {
      orderId: order.id,
      status: paymentRecord.status,
      amount: paymentRecord.amount,
      paymentReference: paymentRecord.paymentReference,
      txHash: paymentRecord.txHash,
      failureReason: paymentRecord.failureReason,
      occurredAt: paymentRecord.confirmedAt,
    });

    return paymentRecord;
  });

  if (payment.status === "CONFIRMED") {
    await maybeTriggerTaskProcessingForOrder(db, queues, {
      orderId: payment.orderId,
      source: "payment-create",
    });
  }

  return toPaymentDto(payment);
}

export async function getPaymentById(
  db: PrismaClient,
  paymentId: string,
): Promise<PaymentDto> {
  const payment = await findPaymentOrThrow(db, paymentId);
  return toPaymentDto(payment);
}

export async function listPayments(
  db: PrismaClient,
  ownerId: string,
  query: ListPaymentsQuery,
): Promise<PaymentListDto> {
  const skip = (query.page - 1) * query.pageSize;
  const where: Prisma.PaymentWhereInput = {
    agent: {
      ownerId,
    },
    ...(query.agentId
      ? {
          agentId: query.agentId,
        }
      : {}),
    ...(query.orderId
      ? {
          orderId: query.orderId,
        }
      : {}),
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
  };

  const [payments, totalItems] = await Promise.all([
    db.payment.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        orderId: true,
        agentId: true,
        chainId: true,
        paymentReference: true,
        txHash: true,
        amount: true,
        feeAmount: true,
        currency: true,
        denom: true,
        payerAddress: true,
        recipientAddress: true,
        status: true,
        confirmationStatus: true,
        confirmationCount: true,
        blockHeight: true,
        confirmedAt: true,
        finalizedAt: true,
        failureReason: true,
        createdAt: true,
        updatedAt: true,
        order: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            serviceTitleSnapshot: true,
            paymentReference: true,
            txHash: true,
            customerId: true,
          },
        },
        agent: {
          select: {
            id: true,
            ownerId: true,
            name: true,
            slug: true,
            treasuryAddress: true,
          },
        },
      },
    }),
    db.payment.count({ where }),
  ]);

  return {
    data: payments.map(toPaymentDto),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
    },
  };
}
