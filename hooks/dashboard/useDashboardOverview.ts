"use client"

import { useMemo } from "react"
import { useBackendAuth } from "@/hooks/auth"
import { useAgents, useDashboardStats, useTasks, useTransactions } from "@/hooks/api"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { getApiErrorMessage, isApiError } from "@/lib/api"
import type {
  AgentDto,
  DashboardStatsDto,
  TaskDto,
  TransactionDto,
} from "@/lib/api/types"

export type DashboardOverviewCard = {
  id: string
  label: string
  value: string
  description: string
}

export type DashboardActivityTone = "success" | "warning" | "destructive" | "outline"

export type DashboardActivityItem = {
  id: string
  kind: "payment" | "task"
  title: string
  description: string
  amountLabel: string | null
  timeLabel: string
  tone: DashboardActivityTone
}

export type DashboardNoticeTone = "neutral" | "warning" | "danger" | "success"

export type DashboardBackendNotice = {
  tone: DashboardNoticeTone
  title: string
  description: string
}

function formatRelativeTime(timestamp: string | null) {
  if (!timestamp) {
    return "Just now"
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return "Just now"
  }

  const diffMs = date.getTime() - Date.now()
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

function isIgnoredDashboardError(error: unknown) {
  return (
    isApiError(error) &&
    (error.status === 401 || error.status === 404)
  )
}

function isAuthError(error: unknown) {
  return isApiError(error) && error.status === 401
}

function isMissingEndpointError(error: unknown) {
  return isApiError(error) && error.status === 404
}

function getActivityToneForPayment(
  transaction: TransactionDto,
): DashboardActivityTone {
  if (transaction.status === "FAILED" || transaction.confirmationStatus === "FAILED") {
    return "destructive"
  }

  if (
    transaction.status === "PENDING" ||
    (transaction.status === "CONFIRMED" &&
      transaction.confirmationStatus !== "FINALIZED") ||
    transaction.confirmationStatus === "CONFIRMING" ||
    transaction.confirmationStatus === "UNCONFIRMED"
  ) {
    return "warning"
  }

  if (
    transaction.status === "CONFIRMED" ||
    transaction.confirmationStatus === "CONFIRMED" ||
    transaction.confirmationStatus === "FINALIZED"
  ) {
    return "success"
  }

  return "outline"
}

function getActivityToneForTask(task: TaskDto): DashboardActivityTone {
  if (task.status === "FAILED" || task.status === "CANCELED" || task.status === "TIMED_OUT") {
    return "destructive"
  }

  if (task.status === "RUNNING" || task.status === "RETRYING" || task.status === "QUEUED") {
    return "warning"
  }

  if (task.status === "SUCCEEDED") {
    return "success"
  }

  return "outline"
}

function mapTransactionActivity(transaction: TransactionDto): DashboardActivityItem {
  const denomLabel = transaction.currency ?? transaction.denom
  const statusCopy =
    transaction.status === "CONFIRMED" &&
      transaction.confirmationStatus === "FINALIZED"
      ? "Payment released"
      : transaction.status === "CONFIRMED"
        ? "Funds are in escrow"
      : transaction.status === "FAILED"
        ? "Payment needs attention"
        : "Payment is moving through the appchain"

  return {
    id: `payment-${transaction.id}`,
    kind: "payment",
    title: transaction.order.serviceTitle || transaction.agent.name,
    description: `${statusCopy} for ${transaction.agent.name}.`,
    amountLabel: `${transaction.amount} ${denomLabel}`.trim(),
    timeLabel: formatRelativeTime(
      transaction.finalizedAt ??
        transaction.confirmedAt ??
        transaction.updatedAt ??
        transaction.createdAt,
    ),
    tone: getActivityToneForPayment(transaction),
  }
}

function mapTaskActivity(task: TaskDto): DashboardActivityItem {
  const title =
    task.order?.serviceTitle ??
    task.agentTask.name ??
    "Autonomous task"
  const description =
    task.status === "SUCCEEDED"
      ? "Task completed successfully."
      : task.status === "FAILED"
        ? "Task needs a retry."
        : "Task is still in progress."

  return {
    id: `task-${task.id}`,
    kind: "task",
    title,
    description,
    amountLabel: null,
    timeLabel: formatRelativeTime(
      task.completedAt ?? task.startedAt ?? task.updatedAt ?? task.createdAt,
    ),
    tone: getActivityToneForTask(task),
  }
}

function formatRevenueValue(stats: DashboardStatsDto | null) {
  if (!stats) {
    return "0"
  }

  return stats.treasury.denom
    ? `${stats.totals.netRevenue} ${stats.treasury.denom}`.trim()
    : stats.totals.netRevenue
}

function buildOverviewCards(input: {
  stats: DashboardStatsDto | null
  agents: AgentDto[]
  recentActivityCount: number
  transactionsCount: number
  tasksCount: number
}): DashboardOverviewCard[] {
  const activeAgents = input.stats
    ? input.stats.totals.activeAgents
    : input.agents.filter((agent) => agent.status === "ACTIVE").length
  const totalAgents = input.stats
    ? input.stats.totals.totalAgents
    : input.agents.length
  const orders = input.stats?.totals.totalOrders ?? 0
  const paidOrders = input.stats?.totals.paidOrders ?? 0

  return [
    {
      id: "revenue",
      label: "Revenue",
      value: formatRevenueValue(input.stats),
      description: input.stats
        ? `${input.stats.totals.pendingRevenue} pending payout`
        : "Revenue data is unavailable because backend stats are not loaded here.",
    },
    {
      id: "orders",
      label: "Orders",
      value: orders.toString(),
      description: input.stats
        ? `${paidOrders} paid so far`
        : "Order history will populate here as customers check out.",
    },
    {
      id: "active_agents",
      label: "Active Agents",
      value: activeAgents.toString(),
      description:
        totalAgents > 0
          ? `${totalAgents} total in your workspace`
          : "Create your first agent to start taking orders.",
    },
    {
      id: "recent_activity",
      label: "Recent Activity",
      value: input.recentActivityCount.toString(),
      description:
        input.transactionsCount + input.tasksCount > 0
          ? `${input.transactionsCount} payments and ${input.tasksCount} task updates`
          : "No activity has landed yet.",
    },
  ]
}

export function useDashboardOverview() {
  const wallet = useWalletConnectionFlow()
  const auth = useBackendAuth()
  const queriesEnabled = wallet.isConnected && auth.isAuthenticated

  const agentsQuery = useAgents(
    {
      ownerId: auth.session?.user.id,
      page: 1,
      pageSize: 12,
    },
    {
      enabled: queriesEnabled,
    },
  )
  const statsQuery = useDashboardStats(
    {
      range: "30d",
    },
    {
      enabled: queriesEnabled,
    },
  )
  const transactionsQuery = useTransactions(
    {
      page: 1,
      pageSize: 8,
    },
    {
      enabled: queriesEnabled,
    },
  )
  const tasksQuery = useTasks(
    {
      page: 1,
      pageSize: 8,
    },
    {
      enabled: queriesEnabled,
    },
  )

  const agents = agentsQuery.data?.data ?? []
  const stats = statsQuery.data?.data ?? null
  const transactions = transactionsQuery.data?.data ?? []
  const tasks = tasksQuery.data?.data ?? []

  const recentActivity = useMemo(() => {
    return [...transactions.map(mapTransactionActivity), ...tasks.map(mapTaskActivity)]
      .sort((left, right) => {
        const leftSource = transactions.find((item) => `payment-${item.id}` === left.id)
        const rightSource = transactions.find((item) => `payment-${item.id}` === right.id)
        const leftTime =
          leftSource?.finalizedAt ??
          leftSource?.confirmedAt ??
          leftSource?.updatedAt ??
          leftSource?.createdAt ??
          tasks.find((item) => `task-${item.id}` === left.id)?.completedAt ??
          tasks.find((item) => `task-${item.id}` === left.id)?.startedAt ??
          tasks.find((item) => `task-${item.id}` === left.id)?.updatedAt ??
          tasks.find((item) => `task-${item.id}` === left.id)?.createdAt ??
          ""
        const rightTime =
          rightSource?.finalizedAt ??
          rightSource?.confirmedAt ??
          rightSource?.updatedAt ??
          rightSource?.createdAt ??
          tasks.find((item) => `task-${item.id}` === right.id)?.completedAt ??
          tasks.find((item) => `task-${item.id}` === right.id)?.startedAt ??
          tasks.find((item) => `task-${item.id}` === right.id)?.updatedAt ??
          tasks.find((item) => `task-${item.id}` === right.id)?.createdAt ??
          ""

        return Date.parse(rightTime) - Date.parse(leftTime)
      })
      .slice(0, 6)
  }, [tasks, transactions])

  const recentActivityCount =
    stats?.totals.totalTransactions !== undefined && stats?.totals.totalTasks !== undefined
      ? stats.totals.totalTransactions + stats.totals.totalTasks
      : recentActivity.length

  const overviewCards = useMemo(
    () =>
      buildOverviewCards({
        stats,
        agents,
        recentActivityCount,
        transactionsCount: transactions.length,
        tasksCount: tasks.length,
      }),
    [agents, recentActivityCount, stats, tasks.length, transactions.length],
  )

  const queries = [agentsQuery, statsQuery, transactionsQuery, tasksQuery]
  const isLoading =
    queriesEnabled &&
    queries.every((query) => query.isLoading || query.isPending)
  const isRefreshing = queriesEnabled && queries.some((query) => query.isFetching)

  const authBlocking = queries.some((query) => isAuthError(query.error))
  const missingSections = [
    isMissingEndpointError(agentsQuery.error) ? "agents" : null,
    isMissingEndpointError(statsQuery.error) ? "stats" : null,
    isMissingEndpointError(transactionsQuery.error) ? "payments" : null,
    isMissingEndpointError(tasksQuery.error) ? "tasks" : null,
  ].filter((value): value is string => Boolean(value))
  const hardError = queries.find(
    (query) => query.isError && !isIgnoredDashboardError(query.error),
  )?.error

  const hasAnyData =
    agents.length > 0 ||
    transactions.length > 0 ||
    tasks.length > 0 ||
    Boolean(
      stats &&
        (
          stats.totals.totalAgents > 0 ||
          stats.totals.totalOrders > 0 ||
          stats.totals.totalTransactions > 0 ||
          stats.totals.totalTasks > 0
        ),
    )

  const isFirstTimeUser =
    queriesEnabled &&
    !isLoading &&
    !isRefreshing &&
    !authBlocking &&
    !hardError &&
    missingSections.length === 0 &&
    !hasAnyData

  const backendNotice: DashboardBackendNotice = useMemo(() => {
    if (!wallet.isConnected) {
      return {
        tone: "neutral",
        title: "Connect your account to load your workspace",
        description:
          "Connect your wallet to load revenue, orders, and recent activity for this workspace.",
      }
    }

    if (!auth.isAuthenticated) {
      return {
        tone: "warning",
        title: "Unlock backend sync to load your workspace",
        description:
          "Sign one wallet message to scope dashboard data, drafts, and orders to your account.",
      }
    }

    if (hardError) {
      return {
        tone: "danger",
        title: "The dashboard hit a temporary backend issue",
        description: getApiErrorMessage(hardError),
      }
    }

    if (authBlocking) {
      return {
        tone: "warning",
        title: "Some personal dashboard views still need a final backend route",
      description:
          "Your wallet is connected, but the backend session for personal workspace data needs a fresh signature.",
      }
    }

    if (missingSections.length > 0) {
      return {
        tone: "warning",
        title: "Some backend routes are unavailable on this deployment",
        description: `This environment is still missing ${missingSections.join(", ")} routes, so those sections may appear empty until the backend is updated.`,
      }
    }

    return {
      tone: "success",
      title: "Live backend data is connected",
        description:
          "Revenue, orders, and recent activity are flowing through the backend overview now.",
    }
  }, [auth.isAuthenticated, authBlocking, hardError, missingSections, wallet.isConnected])

  const refetchAll = async () => {
    if (!queriesEnabled) {
      return
    }

    await Promise.all([
      agentsQuery.refetch(),
      statsQuery.refetch(),
      transactionsQuery.refetch(),
      tasksQuery.refetch(),
    ])
  }

  return {
    wallet,
    auth,
    agents,
    stats,
    transactions,
    tasks,
    overviewCards,
    recentActivity,
    backendNotice,
    isLoading,
    isRefreshing,
    isFirstTimeUser,
    isDisconnected: !wallet.isConnected,
    hasWrongNetwork: wallet.isConnected && !wallet.isOnExpectedAppchain,
    hasAnyData,
    refetchAll,
  }
}
