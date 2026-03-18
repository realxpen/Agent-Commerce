import {
  OrderPaymentStatus,
  OrderStatus,
  PaymentConfirmationStatus,
  PaymentStatus,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { createHttpError } from "../../utils/http-error.js";
import { paymentDtoSelect, type PaymentRecord } from "./payments.types.js";

export type PaymentStore = PrismaClient | Prisma.TransactionClient;

type OrderPaymentContext = {
  orderId: string;
  status: PaymentStatus;
  amount?: Prisma.Decimal;
  paymentReference?: string | null;
  txHash?: string | null;
  failureReason?: string | null;
  occurredAt?: Date | null;
};

function toConfirmationStatus(status: PaymentStatus) {
  switch (status) {
    case PaymentStatus.CONFIRMED:
      return PaymentConfirmationStatus.CONFIRMED;
    case PaymentStatus.FAILED:
      return PaymentConfirmationStatus.FAILED;
    case PaymentStatus.PENDING:
      return PaymentConfirmationStatus.CONFIRMING;
    case PaymentStatus.INITIATED:
    default:
      return PaymentConfirmationStatus.UNCONFIRMED;
  }
}

export async function findPaymentById(
  db: PaymentStore,
  paymentId: string,
): Promise<PaymentRecord | null> {
  return db.payment.findUnique({
    where: {
      id: paymentId,
    },
    select: paymentDtoSelect,
  });
}

export async function findPaymentOrThrow(
  db: PaymentStore,
  paymentId: string,
): Promise<PaymentRecord> {
  const payment = await findPaymentById(db, paymentId);

  if (!payment) {
    throw createHttpError(404, "Payment not found");
  }

  return payment;
}

export async function findOrderForPaymentCreate(
  db: PaymentStore,
  orderId: string,
) {
  return db.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
      agentId: true,
      status: true,
      paymentStatus: true,
      paymentReference: true,
      txHash: true,
      quotedPriceAmount: true,
      currency: true,
      denom: true,
      agent: {
        select: {
          id: true,
          treasuryAddress: true,
        },
      },
    },
  });
}

export async function findOrderByPaymentReference(
  db: PaymentStore,
  paymentReference: string,
) {
  return db.order.findFirst({
    where: {
      paymentReference,
    },
    select: {
      id: true,
      agentId: true,
      status: true,
      paymentStatus: true,
      paymentReference: true,
      txHash: true,
      quotedPriceAmount: true,
      denom: true,
      currency: true,
      agent: {
        select: {
          id: true,
          treasuryAddress: true,
        },
      },
    },
  });
}

export async function findExistingPaymentForCreate(
  db: PaymentStore,
  input: {
    orderId: string;
    paymentReference?: string | null;
    txHash?: string | null;
  },
): Promise<PaymentRecord | null> {
  if (input.txHash) {
    const payment = await db.payment.findUnique({
      where: {
        txHash: input.txHash,
      },
      select: paymentDtoSelect,
    });

    if (payment) {
      return payment;
    }
  }

  if (input.paymentReference) {
    return db.payment.findFirst({
      where: {
        orderId: input.orderId,
        paymentReference: input.paymentReference,
      },
      select: paymentDtoSelect,
    });
  }

  return null;
}

export async function findPaymentForEventMatch(
  db: PaymentStore,
  input: {
    paymentId?: string | null;
    txHash?: string | null;
    orderId?: string | null;
    paymentReference?: string | null;
  },
): Promise<PaymentRecord | null> {
  if (input.paymentId) {
    const payment = await findPaymentById(db, input.paymentId);
    if (payment) {
      return payment;
    }
  }

  if (input.txHash) {
    const payment = await db.payment.findUnique({
      where: {
        txHash: input.txHash,
      },
      select: paymentDtoSelect,
    });

    if (payment) {
      return payment;
    }
  }

  if (input.orderId && input.paymentReference) {
    const payment = await db.payment.findFirst({
      where: {
        orderId: input.orderId,
        paymentReference: input.paymentReference,
      },
      select: paymentDtoSelect,
    });

    if (payment) {
      return payment;
    }
  }

  return null;
}

export async function createPaymentRecord(
  db: PaymentStore,
  data: Prisma.PaymentCreateInput | Prisma.PaymentUncheckedCreateInput,
): Promise<PaymentRecord> {
  return db.payment.create({
    data,
    select: paymentDtoSelect,
  });
}

export async function updatePaymentRecord(
  db: PaymentStore,
  paymentId: string,
  data: Prisma.PaymentUpdateInput,
): Promise<PaymentRecord> {
  return db.payment.update({
    where: {
      id: paymentId,
    },
    data,
    select: paymentDtoSelect,
  });
}

export async function syncOrderFromPaymentStatus(
  db: PaymentStore,
  context: OrderPaymentContext,
) {
  const order = await db.order.findUnique({
    where: {
      id: context.orderId,
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      paidAt: true,
      failedAt: true,
    },
  });

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  const occurredAt = context.occurredAt ?? new Date();
  const data: Prisma.OrderUpdateInput = {};

  if (context.paymentReference !== undefined) {
    data.paymentReference = context.paymentReference;
  }

  if (context.txHash !== undefined) {
    data.txHash = context.txHash;
  }

  switch (context.status) {
    case PaymentStatus.INITIATED:
    case PaymentStatus.PENDING:
      data.paymentStatus = OrderPaymentStatus.PENDING;
      if (order.status === OrderStatus.PENDING) {
        data.status = OrderStatus.PENDING;
      }
      break;
    case PaymentStatus.CONFIRMED:
      data.paymentStatus = OrderPaymentStatus.PAID;
      data.paidAt = order.paidAt ?? occurredAt;

      if (context.amount) {
        data.finalPaidAmount = context.amount;
      }

      if (order.status === OrderStatus.PENDING) {
        data.status = OrderStatus.PAID;
      }
      break;
    case PaymentStatus.FAILED:
      data.paymentStatus = OrderPaymentStatus.FAILED;
      if (order.status === OrderStatus.PENDING) {
        data.status = OrderStatus.FAILED;
        data.failedAt = order.failedAt ?? occurredAt;
      }

      if (context.failureReason) {
        data.deliveryText = context.failureReason;
      }
      break;
    default:
      break;
  }

  return db.order.update({
    where: {
      id: context.orderId,
    },
    data,
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      paidAt: true,
      failedAt: true,
      paymentReference: true,
      txHash: true,
      finalPaidAmount: true,
    },
  });
}

export function buildPaymentWriteData(input: {
  orderId: string;
  agentId: string;
  chainId: string;
  paymentReference?: string | null;
  txHash?: string | null;
  amount: Prisma.Decimal;
  feeAmount?: Prisma.Decimal;
  currency?: string | null;
  denom: string;
  payerAddress: string;
  recipientAddress: string;
  status: PaymentStatus;
  blockHeight?: bigint | null;
  failureReason?: string | null;
  confirmedAt?: Date | null;
  finalizedAt?: Date | null;
  confirmationCount?: number;
}) {
  const data: Prisma.PaymentUncheckedCreateInput = {
    orderId: input.orderId,
    agentId: input.agentId,
    chainId: input.chainId,
    paymentReference: input.paymentReference ?? null,
    txHash: input.txHash ?? null,
    amount: input.amount,
    feeAmount: input.feeAmount ?? new Prisma.Decimal(0),
    currency: input.currency ?? null,
    denom: input.denom,
    payerAddress: input.payerAddress,
    recipientAddress: input.recipientAddress,
    status: input.status,
    confirmationStatus: toConfirmationStatus(input.status),
    confirmationCount: input.confirmationCount ?? 0,
    blockHeight: input.blockHeight ?? null,
    confirmedAt: input.status === PaymentStatus.CONFIRMED ? input.confirmedAt ?? new Date() : null,
    finalizedAt: input.finalizedAt ?? null,
    failureReason: input.failureReason ?? null,
  };

  return data;
}

export function buildPaymentUpdateData(input: {
  paymentReference?: string | null;
  txHash?: string | null;
  amount?: Prisma.Decimal;
  feeAmount?: Prisma.Decimal;
  currency?: string | null;
  denom?: string;
  payerAddress?: string;
  recipientAddress?: string;
  status: PaymentStatus;
  blockHeight?: bigint | null;
  failureReason?: string | null;
  confirmedAt?: Date | null;
  finalizedAt?: Date | null;
  confirmationCount?: number;
}): Prisma.PaymentUpdateInput {
  const data: Prisma.PaymentUpdateInput = {
    status: input.status,
    confirmationStatus: toConfirmationStatus(input.status),
  };

  if (input.paymentReference !== undefined) {
    data.paymentReference = input.paymentReference;
  }

  if (input.txHash !== undefined) {
    data.txHash = input.txHash;
  }

  if (input.amount !== undefined) {
    data.amount = input.amount;
  }

  if (input.feeAmount !== undefined) {
    data.feeAmount = input.feeAmount;
  }

  if (input.currency !== undefined) {
    data.currency = input.currency;
  }

  if (input.denom !== undefined) {
    data.denom = input.denom;
  }

  if (input.payerAddress !== undefined) {
    data.payerAddress = input.payerAddress;
  }

  if (input.recipientAddress !== undefined) {
    data.recipientAddress = input.recipientAddress;
  }

  if (input.blockHeight !== undefined) {
    data.blockHeight = input.blockHeight;
  }

  if (input.failureReason !== undefined) {
    data.failureReason = input.failureReason;
  }

  if (input.confirmedAt !== undefined) {
    data.confirmedAt =
      input.status === PaymentStatus.CONFIRMED ? input.confirmedAt ?? new Date() : input.confirmedAt;
  }

  if (input.finalizedAt !== undefined) {
    data.finalizedAt = input.finalizedAt;
  }

  if (input.confirmationCount !== undefined) {
    data.confirmationCount = input.confirmationCount;
  }

  return data;
}
