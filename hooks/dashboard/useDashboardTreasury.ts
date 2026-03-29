"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useDashboardStats, useOwnerOrders, useTransactions } from "@/hooks/api"
import { useBackendAuth } from "@/hooks/auth"
import {
  useRecoverMissingPayments,
  useRecoverPendingOrderSyncs,
} from "@/hooks/orders"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { getApiErrorMessage } from "@/lib/api"
import type {
  DashboardStatsDto,
  PaymentConfirmationStatus,
  PaymentStatus,
  TransactionDto,
} from "@/lib/api/types"

type TreasuryTransactionStatusFilter = "all" | PaymentStatus

export type TreasuryTransactionView = {
  id: string
  paymentId: string
  type: "income" | "pending" | "failed"
  agent: string
  client: string
  amount: string
  status: string
  tone: "success" | "warning" | "destructive" | "outline"
  date: string
  createdAt: string
  orderId: string
  txHash: string | null
  paymentReference: string | null
}

export type TreasuryStatCard = {
  label: string
  value: string
  change: string
}

export type TreasuryAgentRevenue = {
  name: string
  amount: string
  percentage: number
  toneClass: string
}

function formatRelativeTime(timestamp: string) {
  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) {
    return "Just now"
  }

  const diffMs = value.getTime() - Date.now()
  const absoluteMinutes = Math.round(Math.abs(diffMs) / (60 * 1000))
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  if (absoluteMinutes < 1) {
    return "Just now"
  }

  if (absoluteMinutes < 60) {
    return formatter.format(Math.round(diffMs / (60 * 1000)), "minute")
  }

  const absoluteHours = Math.round(absoluteMinutes / 60)
  if (absoluteHours < 24) {
    return formatter.format(Math.round(diffMs / (60 * 60 * 1000)), "hour")
  }

  return formatter.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day")
}

function formatDisplayAmount(amount: string | null | undefined, denom: string | null | undefined) {
  if (!amount) {
    return denom ? `0 ${denom}` : "0"
  }

  const numericValue = Number(amount)
  const formattedAmount = Number.isFinite(numericValue)
    ? new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      }).format(numericValue)
    : amount

  return denom ? `${formattedAmount} ${denom}`.trim() : formattedAmount
}

function isPendingTransaction(transaction: TransactionDto) {
  return (
    transaction.status === "INITIATED" ||
    transaction.status === "PENDING" ||
    (transaction.status === "CONFIRMED" &&
      transaction.confirmationStatus !== "FINALIZED") ||
    transaction.confirmationStatus === "UNCONFIRMED" ||
    transaction.confirmationStatus === "CONFIRMING"
  )
}

function getTransactionTone(transaction: TransactionDto) {
  if (
    transaction.status === "FAILED" ||
    transaction.status === "REFUNDED" ||
    transaction.confirmationStatus === "FAILED"
  ) {
    return "destructive" as const
  }

  if (isPendingTransaction(transaction)) {
    return "warning" as const
  }

  if (
    transaction.status === "CONFIRMED" ||
    transaction.confirmationStatus === "CONFIRMED" ||
    transaction.confirmationStatus === "FINALIZED"
  ) {
    return "success" as const
  }

  return "outline" as const
}

function getTransactionViewType(transaction: TransactionDto) {
  if (getTransactionTone(transaction) === "destructive") {
    return "failed" as const
  }

  if (isPendingTransaction(transaction)) {
    return "pending" as const
  }

  return "income" as const
}

function getTransactionStatusLabel(
  status: PaymentStatus,
  confirmationStatus: PaymentConfirmationStatus,
) {
  if (status === "CONFIRMED" && confirmationStatus === "FINALIZED") {
    return "released"
  }

  if (status === "CONFIRMED") {
    return "in escrow"
  }

  return status.toLowerCase()
}

function buildTransactionView(transaction: TransactionDto): TreasuryTransactionView {
  const timestamp =
    transaction.finalizedAt ??
    transaction.confirmedAt ??
    transaction.updatedAt ??
    transaction.createdAt

  return {
    id: transaction.paymentReference ?? transaction.txHash ?? transaction.id,
    paymentId: transaction.id,
    type: getTransactionViewType(transaction),
    agent: transaction.agent.name,
    client: transaction.order.serviceTitle,
    amount: formatDisplayAmount(
      transaction.amount,
      transaction.currency ?? transaction.denom,
    ),
    status: getTransactionStatusLabel(
      transaction.status,
      transaction.confirmationStatus,
    ),
    tone: getTransactionTone(transaction),
    date: formatRelativeTime(timestamp),
    createdAt: timestamp,
    orderId: transaction.order.id,
    txHash: transaction.txHash,
    paymentReference: transaction.paymentReference,
  }
}

function buildRevenueByAgent(
  transactions: TransactionDto[],
  denom: string | null,
): TreasuryAgentRevenue[] {
  const confirmed = transactions.filter(
    (transaction) =>
      transaction.status === "CONFIRMED" &&
      transaction.confirmationStatus === "FINALIZED",
  )

  if (confirmed.length === 0) {
    return []
  }

  const totals = new Map<string, number>()
  for (const transaction of confirmed) {
    const current = totals.get(transaction.agent.name) ?? 0
    totals.set(transaction.agent.name, current + Number(transaction.amount))
  }

  const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0)
  const toneClasses = ["bg-indigo-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500"]

  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([name, amount], index) => ({
      name,
      amount: formatDisplayAmount(String(amount), denom),
      percentage: grandTotal > 0 ? Math.max(8, Math.round((amount / grandTotal) * 100)) : 0,
      toneClass: toneClasses[index % toneClasses.length],
    }))
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function useDashboardTreasury() {
  const wallet = useWalletConnectionFlow()
  const auth = useBackendAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<TreasuryTransactionStatusFilter>("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())

  const queriesEnabled = wallet.isConnected && auth.isAuthenticated
  const statsQuery = useDashboardStats(
    { range: "30d" },
    { enabled: queriesEnabled },
  )
  const transactionsQuery = useTransactions(
    {
      page: 1,
      pageSize: 100,
    },
    {
      enabled: queriesEnabled,
    },
  )
  const ownerOrdersQuery = useOwnerOrders(
    auth.currentSession?.user.id,
    {
      page: 1,
      pageSize: 50,
    },
    {
      enabled: queriesEnabled,
    },
  )

  const stats = statsQuery.data?.data ?? null
  const transactions = transactionsQuery.data?.data ?? []
  const ownerOrders = ownerOrdersQuery.data?.data ?? []
  const pendingOrderSyncRecovery = useRecoverPendingOrderSyncs({
    enabled: queriesEnabled,
  })
  const paymentRecovery = useRecoverMissingPayments({
    orders: ownerOrders,
    enabled: queriesEnabled,
  })
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        const matchesStatus =
          statusFilter === "all" || transaction.status === statusFilter
        const matchesSearch =
          deferredSearchQuery.length === 0 ||
          [
            transaction.agent.name,
            transaction.order.serviceTitle,
            transaction.paymentReference ?? "",
            transaction.txHash ?? "",
            transaction.id,
          ]
            .join(" ")
            .toLowerCase()
            .includes(deferredSearchQuery)

        return matchesStatus && matchesSearch
      })
      .map(buildTransactionView)
  }, [deferredSearchQuery, statusFilter, transactions])

  const denom =
    stats?.treasury.denom ??
    transactions[0]?.currency ??
    transactions[0]?.denom ??
    null
  const activeEscrows = transactions.filter(isPendingTransaction).length
  const statCards: TreasuryStatCard[] = [
    {
      label: "Available Balance",
      value: formatDisplayAmount(stats?.treasury.availableBalance, denom),
      change: "All confirmed payouts",
    },
    {
      label: "Pending Revenue",
      value: formatDisplayAmount(stats?.treasury.pendingBalance, denom),
      change: "Awaiting settlement",
    },
    {
      label: "Net Revenue",
      value: formatDisplayAmount(stats?.totals.netRevenue, denom),
      change: "Last 30 days",
    },
    {
      label: "Active Escrows",
      value: activeEscrows.toString(),
      change: "Tracked live",
    },
  ]

  const revenueByAgent = useMemo(
    () => buildRevenueByAgent(transactions, denom),
    [denom, transactions],
  )

  const exportCsv = () => {
    if (filteredTransactions.length === 0) {
      return
    }

    const rows = [
      ["Payment ID", "Order ID", "Agent", "Service", "Amount", "Status", "Date", "Payment Reference", "Transaction Hash"],
      ...filteredTransactions.map((transaction) => [
        transaction.paymentId,
        transaction.orderId,
        transaction.agent,
        transaction.client,
        transaction.amount,
        transaction.status,
        new Date(transaction.createdAt).toISOString(),
        transaction.paymentReference ?? "",
        transaction.txHash ?? "",
      ]),
    ]

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n")

    downloadTextFile("agentcommerce-transactions.csv", csv)
  }

  const error = statsQuery.error ?? transactionsQuery.error ?? ownerOrdersQuery.error ?? null

  return {
    wallet,
    auth,
    stats,
    transactions: filteredTransactions,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isFilterOpen,
    setIsFilterOpen,
    statCards,
    revenueByAgent,
    settlementCount: stats?.totals.totalTransactions ?? transactions.length,
    settlementDescription:
      stats && Number(stats.treasury.pendingBalance) > 0
        ? "Escrowed funds are waiting for customer completion before they move into available balance."
        : stats?.totals.totalTransactions && stats.totals.totalTransactions > 0
          ? "Released payments and escrow activity are flowing through the backend."
          : "Payment records will appear here after the first successful checkout.",
    exportCsv,
    hasAnyData:
      Boolean(stats) || transactions.length > 0,
    isLoading:
      queriesEnabled &&
      (statsQuery.isLoading || transactionsQuery.isLoading || ownerOrdersQuery.isLoading),
    isFetching:
      queriesEnabled &&
      (statsQuery.isFetching ||
        transactionsQuery.isFetching ||
        ownerOrdersQuery.isFetching),
    isError: Boolean(error),
    error,
    errorMessage: error ? getApiErrorMessage(error) : null,
    recoveryNotice: [
      pendingOrderSyncRecovery.notice,
      paymentRecovery.notice,
    ]
      .filter(Boolean)
      .join(" ") || null,
    recoveryWarning: [
      pendingOrderSyncRecovery.warning,
      paymentRecovery.warning,
    ]
      .filter(Boolean)
      .join(" ") || null,
    isRecoveringPayments:
      pendingOrderSyncRecovery.isRecovering || paymentRecovery.isRecovering,
    refetchAll: async () => {
      if (!queriesEnabled) {
        return
      }

      await Promise.all([
        statsQuery.refetch(),
        transactionsQuery.refetch(),
        ownerOrdersQuery.refetch(),
      ])
    },
  }
}
