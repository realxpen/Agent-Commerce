import {
  ContractEventStatus,
  Prisma,
  PaymentStatus,
  TreasuryPeriod,
  type PrismaClient,
} from "@prisma/client";

import { createHttpError } from "../../utils/http-error.js";
import type { NormalizedContractEvent } from "./contract-events.parser.js";
import { contractEventDtoSelect, type ContractEventRecord } from "./contract-events.types.js";

export type ContractEventStore = PrismaClient | Prisma.TransactionClient;

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, amount: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

export async function upsertContractEventSeed(
  db: ContractEventStore,
  input: NormalizedContractEvent,
): Promise<ContractEventRecord> {
  return db.contractEvent.upsert({
    where: {
      eventKey: input.eventKey,
    },
    create: {
      eventKey: input.eventKey,
      chainId: input.chainId,
      contractType: input.contractType,
      contractAddress: input.contractAddress,
      txHash: input.txHash,
      blockHeight: input.blockHeight,
      blockTimestamp: input.blockTimestamp,
      eventName: input.eventName,
      eventIndex: input.eventIndex,
      status: ContractEventStatus.PENDING,
      rawPayload: input.rawPayload ?? undefined,
      parsedPayload: input.parsedPayload,
      agentId: input.references.agentId,
      orderId: input.references.orderId,
      paymentId: input.references.paymentId,
    },
    update: {
      chainId: input.chainId,
      contractType: input.contractType,
      contractAddress: input.contractAddress,
      txHash: input.txHash,
      blockHeight: input.blockHeight,
      blockTimestamp: input.blockTimestamp,
      eventName: input.eventName,
      eventIndex: input.eventIndex,
      ...(input.rawPayload
        ? {
            rawPayload: input.rawPayload,
          }
        : {}),
      parsedPayload: input.parsedPayload,
      agentId: input.references.agentId,
      orderId: input.references.orderId,
      paymentId: input.references.paymentId,
    },
    select: contractEventDtoSelect,
  });
}

export async function findContractEventById(
  db: ContractEventStore,
  contractEventId: string,
): Promise<ContractEventRecord | null> {
  return db.contractEvent.findUnique({
    where: {
      id: contractEventId,
    },
    select: contractEventDtoSelect,
  });
}

export async function findContractEventOrThrow(
  db: ContractEventStore,
  contractEventId: string,
): Promise<ContractEventRecord> {
  const contractEvent = await findContractEventById(db, contractEventId);

  if (!contractEvent) {
    throw createHttpError(404, "Contract event not found");
  }

  return contractEvent;
}

export async function incrementContractEventProcessingAttempt(
  db: ContractEventStore,
  contractEventId: string,
): Promise<ContractEventRecord> {
  return db.contractEvent.update({
    where: {
      id: contractEventId,
    },
    data: {
      processingAttempts: {
        increment: 1,
      },
      errorMessage: null,
    },
    select: contractEventDtoSelect,
  });
}

export async function markContractEventProcessed(
  db: ContractEventStore,
  contractEventId: string,
  input: {
    agentId?: string | null;
    orderId?: string | null;
    paymentId?: string | null;
  },
): Promise<ContractEventRecord> {
  return db.contractEvent.update({
    where: {
      id: contractEventId,
    },
    data: {
      status: ContractEventStatus.PROCESSED,
      processedAt: new Date(),
      errorMessage: null,
      agentId: input.agentId ?? null,
      orderId: input.orderId ?? null,
      paymentId: input.paymentId ?? null,
    },
    select: contractEventDtoSelect,
  });
}

export async function markContractEventFailed(
  db: ContractEventStore,
  contractEventId: string,
  errorMessage: string,
): Promise<ContractEventRecord> {
  return db.contractEvent.update({
    where: {
      id: contractEventId,
    },
    data: {
      status: ContractEventStatus.FAILED,
      errorMessage,
    },
    select: contractEventDtoSelect,
  });
}

export async function recomputeDailyTreasurySnapshot(
  db: ContractEventStore,
  input: {
    agentId: string;
    denom: string;
    currency?: string | null;
    referenceTime: Date;
  },
) {
  const windowStart = startOfUtcDay(input.referenceTime);
  const windowEnd = addDays(windowStart, 1);
  const snapshotAt = windowStart;

  const baseWhere = {
    agentId: input.agentId,
    denom: input.denom,
    createdAt: {
      gte: windowStart,
      lt: windowEnd,
    },
  } satisfies Prisma.PaymentWhereInput;

  const [confirmedPayments, pendingPayments, refundPayments, allPayments, orders] =
    await Promise.all([
      db.payment.aggregate({
        where: {
          ...baseWhere,
          status: PaymentStatus.CONFIRMED,
        },
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),
      db.payment.aggregate({
        where: {
          ...baseWhere,
          status: {
            in: [PaymentStatus.INITIATED, PaymentStatus.PENDING],
          },
        },
        _sum: {
          amount: true,
        },
      }),
      db.payment.aggregate({
        where: {
          ...baseWhere,
          status: PaymentStatus.REFUNDED,
        },
        _sum: {
          amount: true,
        },
      }),
      db.payment.aggregate({
        where: baseWhere,
        _count: {
          _all: true,
        },
      }),
      db.payment.findMany({
        where: baseWhere,
        select: {
          orderId: true,
        },
        distinct: ["orderId"],
      }),
    ]);

  const confirmedAmount = confirmedPayments._sum.amount ?? new Prisma.Decimal(0);
  const pendingAmount = pendingPayments._sum.amount ?? new Prisma.Decimal(0);
  const refundAmount = refundPayments._sum.amount ?? new Prisma.Decimal(0);
  const totalBalance = confirmedAmount.plus(pendingAmount);
  const netRevenue = confirmedAmount.minus(refundAmount);

  return db.treasurySnapshot.upsert({
    where: {
      agentId_period_snapshotAt_denom: {
        agentId: input.agentId,
        period: TreasuryPeriod.DAILY,
        snapshotAt,
        denom: input.denom,
      },
    },
    create: {
      agentId: input.agentId,
      period: TreasuryPeriod.DAILY,
      snapshotAt,
      windowStart,
      windowEnd,
      currency: input.currency ?? null,
      denom: input.denom,
      totalBalance,
      availableBalance: confirmedAmount,
      pendingBalance: pendingAmount,
      grossRevenue: confirmedAmount,
      netRevenue,
      refundAmount,
      orderCount: orders.length,
      paymentCount: allPayments._count._all,
      metadata: {
        source: "event-indexer",
      },
    },
    update: {
      currency: input.currency ?? null,
      windowStart,
      windowEnd,
      totalBalance,
      availableBalance: confirmedAmount,
      pendingBalance: pendingAmount,
      grossRevenue: confirmedAmount,
      netRevenue,
      refundAmount,
      orderCount: orders.length,
      paymentCount: allPayments._count._all,
      metadata: {
        source: "event-indexer",
      },
    },
  });
}
