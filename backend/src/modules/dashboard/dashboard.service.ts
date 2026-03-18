import {
  AgentStatus,
  PaymentStatus,
  Prisma,
  TreasuryPeriod,
  type PrismaClient,
} from "@prisma/client";

import type { DashboardStatsQuery } from "./dashboard.schemas.js";
import type { DashboardStatsDto } from "./dashboard.types.js";

function decimalToString(value: Prisma.Decimal | null | undefined) {
  return (value ?? new Prisma.Decimal(0)).toString();
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function parseRange(range: string) {
  const normalized = range.trim().toLowerCase();
  const now = new Date();

  const dayMatch = normalized.match(/^(\d+)d$/);
  if (dayMatch) {
    const days = Math.max(1, Number(dayMatch[1]));
    return {
      normalized,
      windowStart: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    };
  }

  const hourMatch = normalized.match(/^(\d+)h$/);
  if (hourMatch) {
    const hours = Math.max(1, Number(hourMatch[1]));
    return {
      normalized,
      windowStart: new Date(now.getTime() - hours * 60 * 60 * 1000),
    };
  }

  return {
    normalized: "30d",
    windowStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  };
}

function formatTrendLabel(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function getDashboardStats(
  db: PrismaClient,
  ownerId: string,
  query: DashboardStatsQuery,
): Promise<DashboardStatsDto> {
  const range = parseRange(query.range);
  const agentWhere: Prisma.AgentWhereInput = {
    ownerId,
    ...(query.agentId
      ? {
          id: query.agentId,
        }
      : {}),
  };
  const orderWhere: Prisma.OrderWhereInput = {
    agent: agentWhere,
    createdAt: {
      gte: range.windowStart,
    },
  };
  const paymentWhere: Prisma.PaymentWhereInput = {
    agent: agentWhere,
    createdAt: {
      gte: range.windowStart,
    },
  };
  const allTimePaymentWhere: Prisma.PaymentWhereInput = {
    agent: agentWhere,
  };
  const taskRunWhere: Prisma.TaskRunWhereInput = {
    agentTask: {
      agent: agentWhere,
    },
    createdAt: {
      gte: range.windowStart,
    },
  };

  const [
    totalAgents,
    activeAgents,
    totalOrders,
    paidOrders,
    totalTasks,
    confirmedPayments,
    pendingPayments,
    latestPayment,
    allTimeConfirmedPayments,
    allTimePendingPayments,
    trendSnapshots,
  ] = await Promise.all([
    db.agent.count({
      where: agentWhere,
    }),
    db.agent.count({
      where: {
        ...agentWhere,
        status: AgentStatus.ACTIVE,
      },
    }),
    db.order.count({
      where: orderWhere,
    }),
    db.order.count({
      where: {
        ...orderWhere,
        paymentStatus: "PAID",
      },
    }),
    db.taskRun.count({
      where: taskRunWhere,
    }),
    db.payment.aggregate({
      where: {
        ...paymentWhere,
        status: PaymentStatus.CONFIRMED,
      },
      _sum: {
        amount: true,
        feeAmount: true,
      },
      _count: {
        _all: true,
      },
    }),
    db.payment.aggregate({
      where: {
        ...paymentWhere,
        status: {
          in: [PaymentStatus.INITIATED, PaymentStatus.PENDING],
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),
    db.payment.findFirst({
      where: allTimePaymentWhere,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        denom: true,
        currency: true,
      },
    }),
    db.payment.aggregate({
      where: {
        ...allTimePaymentWhere,
        status: PaymentStatus.CONFIRMED,
      },
      _sum: {
        amount: true,
        feeAmount: true,
      },
    }),
    db.payment.aggregate({
      where: {
        ...allTimePaymentWhere,
        status: {
          in: [PaymentStatus.INITIATED, PaymentStatus.PENDING],
        },
      },
      _sum: {
        amount: true,
      },
    }),
    db.treasurySnapshot.findMany({
      where: {
        agent: agentWhere,
        period: TreasuryPeriod.DAILY,
        snapshotAt: {
          gte: startOfUtcDay(range.windowStart),
        },
      },
      orderBy: {
        snapshotAt: "asc",
      },
      select: {
        snapshotAt: true,
        grossRevenue: true,
        netRevenue: true,
        orderCount: true,
        paymentCount: true,
      },
    }),
  ]);

  const grossRevenue = confirmedPayments._sum.amount ?? new Prisma.Decimal(0);
  const confirmedFeeAmount = confirmedPayments._sum.feeAmount ?? new Prisma.Decimal(0);
  const netRevenue = grossRevenue.minus(confirmedFeeAmount);
  const pendingRevenue = pendingPayments._sum.amount ?? new Prisma.Decimal(0);

  const allTimeConfirmedAmount =
    allTimeConfirmedPayments._sum.amount ?? new Prisma.Decimal(0);
  const allTimeConfirmedFeeAmount =
    allTimeConfirmedPayments._sum.feeAmount ?? new Prisma.Decimal(0);
  const availableBalance = allTimeConfirmedAmount.minus(allTimeConfirmedFeeAmount);
  const pendingBalance = allTimePendingPayments._sum.amount ?? new Prisma.Decimal(0);

  const trendsByLabel = new Map<
    string,
    {
      label: string;
      grossRevenue: Prisma.Decimal;
      netRevenue: Prisma.Decimal;
      orderCount: number;
      paymentCount: number;
    }
  >();

  for (const snapshot of trendSnapshots) {
    const label = formatTrendLabel(snapshot.snapshotAt);
    const existing = trendsByLabel.get(label);

    if (!existing) {
      trendsByLabel.set(label, {
        label,
        grossRevenue: snapshot.grossRevenue,
        netRevenue: snapshot.netRevenue,
        orderCount: snapshot.orderCount,
        paymentCount: snapshot.paymentCount,
      });
      continue;
    }

    existing.grossRevenue = existing.grossRevenue.plus(snapshot.grossRevenue);
    existing.netRevenue = existing.netRevenue.plus(snapshot.netRevenue);
    existing.orderCount += snapshot.orderCount;
    existing.paymentCount += snapshot.paymentCount;
  }

  return {
    range: range.normalized,
    totals: {
      totalAgents,
      activeAgents,
      totalOrders,
      paidOrders,
      totalTransactions:
        confirmedPayments._count._all + pendingPayments._count._all,
      totalTasks,
      grossRevenue: decimalToString(grossRevenue),
      netRevenue: decimalToString(netRevenue),
      pendingRevenue: decimalToString(pendingRevenue),
    },
    treasury: {
      availableBalance: decimalToString(availableBalance),
      pendingBalance: decimalToString(pendingBalance),
      denom: latestPayment?.currency ?? latestPayment?.denom ?? null,
    },
    trends: [...trendsByLabel.values()].map((entry) => ({
      label: entry.label,
      grossRevenue: entry.grossRevenue.toString(),
      netRevenue: entry.netRevenue.toString(),
      orderCount: entry.orderCount,
      paymentCount: entry.paymentCount,
    })),
  };
}
