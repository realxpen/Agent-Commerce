"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAgents, useOwnerOrders, useTasks } from "@/hooks/api"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { useBackendAuth } from "@/hooks/auth"
import {
  useRecoverMissingPayments,
  useRecoverPendingOrderSyncs,
} from "@/hooks/orders"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { agentCommerceApi, getApiErrorMessage } from "@/lib/api"
import type { AgentDto, TaskDto, TaskRunStatus } from "@/lib/api/types"

export type DashboardTaskLogTone = "info" | "success" | "warning" | "error"
export type DashboardTaskFilterRange = "all" | "today" | "week" | "month"

export type DashboardTaskLog = {
  time: string
  message: string
  type: DashboardTaskLogTone
}

export type DashboardTaskHistoryEvent = {
  event: string
  time: string
  user: string
}

export type DashboardTaskView = {
  id: string
  agent: string
  client: string
  task: string
  status: TaskRunStatus
  progress: number
  date: string
  timestamp: string
  logs: DashboardTaskLog[]
  history: DashboardTaskHistoryEvent[]
  orderId: string | null
  txHash: string | null
  outputPreview: string | null
  amountLabel: string | null
}

type DashboardTaskStatusFilter = "all" | TaskRunStatus

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

function formatClockTime(timestamp: string | null) {
  if (!timestamp) {
    return "Pending"
  }

  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) {
    return "Pending"
  }

  return value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatActor(task: TaskDto, agentsById: Map<string, AgentDto>) {
  return (
    task.order?.agent.name ??
    agentsById.get(task.agentTask.agentId)?.name ??
    "AgentCommerce"
  )
}

function formatClient(task: TaskDto) {
  return (
    task.order?.customer.displayName ??
    task.order?.customer.email ??
    "Customer"
  )
}

function formatTaskTitle(task: TaskDto) {
  return task.order?.serviceTitle ?? task.agentTask.name
}

function getTaskProgress(status: TaskRunStatus) {
  switch (status) {
    case "QUEUED":
      return 15
    case "RUNNING":
      return 65
    case "RETRYING":
      return 45
    case "SUCCEEDED":
    case "FAILED":
    case "CANCELED":
    case "TIMED_OUT":
      return 100
    default:
      return 0
  }
}

function getPrimaryTimestamp(task: TaskDto) {
  return task.completedAt ?? task.startedAt ?? task.updatedAt ?? task.createdAt
}

function getOutputPreview(output: TaskDto["output"]) {
  if (typeof output === "string" && output.trim().length > 0) {
    return output.trim().slice(0, 280)
  }

  if (output && typeof output === "object") {
    try {
      return JSON.stringify(output, null, 2).slice(0, 280)
    } catch {
      return "Structured output is available for this task run."
    }
  }

  return null
}

function normalizeTaskErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("no remaining quota") ||
    normalized.includes("insufficient_quota") ||
    normalized.includes("exceeded your current quota") ||
    normalized.includes("resource exhausted")
  ) {
    return "The configured AI provider has no remaining quota. Customer payment is still secured, but automated fulfillment cannot continue until billing is restored or the order is resumed manually."
  }

  return message
}

function buildTaskLogs(task: TaskDto): DashboardTaskLog[] {
  const logs: DashboardTaskLog[] = [
    {
      time: formatClockTime(task.createdAt),
      message: `Task run queued for ${formatTaskTitle(task)}.`,
      type: "info",
    },
  ]

  if (task.order?.customerNote) {
    logs.push({
      time: formatClockTime(task.createdAt),
      message: "Customer brief was attached to this order.",
      type: "info",
    })
  }

  if (task.startedAt) {
    logs.push({
      time: formatClockTime(task.startedAt),
      message: `Fulfillment attempt ${task.attemptNumber} started.`,
      type: "info",
    })
  }

  if (task.nextRetryAt) {
    logs.push({
      time: formatClockTime(task.updatedAt),
      message: `Another retry is scheduled for ${new Date(task.nextRetryAt).toLocaleString()}.`,
      type: "warning",
    })
  }

  const outputPreview = getOutputPreview(task.output)
  if (outputPreview && task.status === "SUCCEEDED") {
    logs.push({
      time: formatClockTime(task.completedAt ?? task.updatedAt),
      message: "Structured output was generated for this task.",
      type: "success",
    })
  }

  if (task.errorMessage) {
    logs.push({
      time: formatClockTime(task.completedAt ?? task.updatedAt),
      message: normalizeTaskErrorMessage(task.errorMessage),
      type: "error",
    })
  }

  if (task.status === "SUCCEEDED") {
    logs.push({
      time: formatClockTime(task.completedAt ?? task.updatedAt),
      message: "Task completed successfully.",
      type: "success",
    })
  } else if (task.status === "FAILED" || task.status === "TIMED_OUT") {
    logs.push({
      time: formatClockTime(task.completedAt ?? task.updatedAt),
      message: "Task run ended with an error and needs attention.",
      type: "error",
    })
  } else if (task.status === "RETRYING") {
    logs.push({
      time: formatClockTime(task.updatedAt),
      message: "Task is retrying after a previous failure.",
      type: "warning",
    })
  } else if (task.status === "RUNNING") {
    logs.push({
      time: formatClockTime(task.updatedAt),
      message: "Task is still running.",
      type: "info",
    })
  }

  return logs
}

function buildTaskHistory(
  task: TaskDto,
  agentsById: Map<string, AgentDto>,
): DashboardTaskHistoryEvent[] {
  const events: DashboardTaskHistoryEvent[] = [
    {
      event: "Created",
      time: formatClockTime(task.createdAt),
      user: formatClient(task),
    },
    {
      event: "Queued",
      time: formatClockTime(task.createdAt),
      user: "AgentCommerce",
    },
  ]

  if (task.startedAt) {
    events.push({
      event: "Started",
      time: formatClockTime(task.startedAt),
      user: formatActor(task, agentsById),
    })
  }

  if (task.status === "RETRYING" && task.nextRetryAt) {
    events.push({
      event: "Retry Scheduled",
      time: formatClockTime(task.updatedAt),
      user: "AgentCommerce",
    })
  }

  if (task.completedAt) {
    events.push({
      event:
        task.status === "SUCCEEDED"
          ? "Finished"
          : task.status === "FAILED" || task.status === "TIMED_OUT"
            ? "Failed"
            : "Updated",
      time: formatClockTime(task.completedAt),
      user: formatActor(task, agentsById),
    })
  }

  return events
}

function matchesDateRange(timestamp: string, range: DashboardTaskFilterRange) {
  if (range === "all") {
    return true
  }

  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) {
    return false
  }

  const now = new Date()

  if (range === "today") {
    return value.toDateString() === now.toDateString()
  }

  if (range === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return value >= weekAgo
  }

  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return value >= monthAgo
}

function formatAmountLabel(task: TaskDto) {
  if (!task.order) {
    return null
  }

  return `${task.order.finalPaidAmount ?? task.order.quotedPriceAmount} ${
    task.order.currency ?? task.order.denom
  }`.trim()
}

export function useDashboardTasks() {
  const queryClient = useQueryClient()
  const wallet = useWalletConnectionFlow()
  const auth = useBackendAuth()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<DashboardTaskStatusFilter>("all")
  const [agentFilter, setAgentFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DashboardTaskFilterRange>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [resumeNotice, setResumeNotice] = useState<string | null>(null)
  const [resumeWarning, setResumeWarning] = useState<string | null>(null)
  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())

  const queriesEnabled = wallet.isConnected && auth.isAuthenticated
  const tasksQuery = useTasks(
    {
      page: 1,
      pageSize: 50,
    },
    {
      enabled: queriesEnabled,
    },
  )
  const agentsQuery = useAgents(
    {
      ownerId: auth.currentSession?.user.id,
      page: 1,
      pageSize: 50,
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

  const tasks = tasksQuery.data?.data ?? []
  const agents = agentsQuery.data?.data ?? []
  const ownerOrders = ownerOrdersQuery.data?.data ?? []
  const pendingOrderSyncRecovery = useRecoverPendingOrderSyncs({
    enabled: queriesEnabled,
  })
  const paymentRecovery = useRecoverMissingPayments({
    orders: ownerOrders,
    enabled: queriesEnabled,
  })
  const agentsById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents],
  )

  const taskViews = useMemo<DashboardTaskView[]>(() => {
    return tasks.map((task) => {
      const timestamp = getPrimaryTimestamp(task)
      return {
        id: task.id,
        agent: formatActor(task, agentsById),
        client: formatClient(task),
        task: formatTaskTitle(task),
        status: task.status,
        progress: getTaskProgress(task.status),
        date: formatRelativeTime(timestamp),
        timestamp,
        logs: buildTaskLogs(task),
        history: buildTaskHistory(task, agentsById),
        orderId: task.order?.id ?? null,
        txHash: task.order?.txHash ?? null,
        outputPreview: getOutputPreview(task.output),
        amountLabel: formatAmountLabel(task),
      }
    })
  }, [agentsById, tasks])

  const agentNames = useMemo(
    () => Array.from(new Set(taskViews.map((task) => task.agent))).sort((left, right) => left.localeCompare(right)),
    [taskViews],
  )

  const filteredTasks = useMemo(() => {
    return taskViews.filter((task) => {
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesAgent = agentFilter === "all" || task.agent === agentFilter
      const matchesSearch =
        deferredSearchQuery.length === 0 ||
        [task.task, task.agent, task.client, task.id]
          .join(" ")
          .toLowerCase()
          .includes(deferredSearchQuery)
      const matchesDate = matchesDateRange(task.timestamp, dateRange)

      return matchesStatus && matchesAgent && matchesSearch && matchesDate
    })
  }, [agentFilter, dateRange, deferredSearchQuery, statusFilter, taskViews])

  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ??
    taskViews.find((task) => task.id === selectedTaskId) ??
    null

  const activeTaskCount = filteredTasks.filter((task) =>
    task.status === "QUEUED" ||
    task.status === "RUNNING" ||
    task.status === "RETRYING",
  ).length
  const completedTaskCount = filteredTasks.filter(
    (task) => task.status === "SUCCEEDED",
  ).length
  const failedTaskCount = filteredTasks.filter(
    (task) =>
      task.status === "FAILED" ||
      task.status === "TIMED_OUT" ||
      task.status === "CANCELED",
  ).length

  const error = tasksQuery.error ?? agentsQuery.error ?? ownerOrdersQuery.error ?? null
  const errorMessage = error ? getApiErrorMessage(error) : null
  const activeFiltersCount = [
    statusFilter !== "all",
    agentFilter !== "all",
    dateRange !== "all",
  ].filter(Boolean).length

  const clearFilters = () => {
    setStatusFilter("all")
    setAgentFilter("all")
    setDateRange("all")
    setSearchQuery("")
  }

  const refetchAll = async () => {
    if (!queriesEnabled) {
      return
    }

    await Promise.all([
      tasksQuery.refetch(),
      agentsQuery.refetch(),
      ownerOrdersQuery.refetch(),
    ])
  }

  const canResumeTask = (task: DashboardTaskView | null) =>
    Boolean(
      task?.orderId &&
        (task.status === "FAILED" ||
          task.status === "TIMED_OUT" ||
          task.status === "CANCELED"),
    )

  const resumeTask = async (task: DashboardTaskView | null) => {
    if (!task?.orderId) {
      setResumeWarning("This task is not linked to a resumable order yet.")
      return null
    }

    setResumeNotice(null)
    setResumeWarning(null)

    try {
      setResumingOrderId(task.orderId)
      const result = await agentCommerceApi.triggerOrderTaskProcessing(task.orderId, {
        force: true,
      })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKeys.tasks() }),
        queryClient.invalidateQueries({ queryKey: ["api", "tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["api", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["api", "transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["api", "dashboard-stats"] }),
      ])
      await refetchAll()
      setSelectedTaskId(result.data.id)
      setResumeNotice(
        result.meta.reusedExistingRun
          ? "Fulfillment is already queued or running for this order."
          : "AgentCommerce queued a fresh fulfillment run for this paid order.",
      )

      return result
    } catch (error) {
      setResumeWarning(getApiErrorMessage(error))
      return null
    } finally {
      setResumingOrderId(null)
    }
  }

  return {
    wallet,
    auth,
    tasks: filteredTasks,
    allTasks: taskViews,
    selectedTask,
    setSelectedTaskId,
    statusFilter,
    setStatusFilter,
    agentFilter,
    setAgentFilter,
    dateRange,
    setDateRange,
    searchQuery,
    setSearchQuery,
    isFilterOpen,
    setIsFilterOpen,
    activeFiltersCount,
    clearFilters,
    agentNames,
    activeTaskCount,
    completedTaskCount,
    failedTaskCount,
    hasAnyData: taskViews.length > 0,
    isLoading:
      queriesEnabled &&
      (tasksQuery.isLoading || agentsQuery.isLoading || ownerOrdersQuery.isLoading),
    isFetching:
      queriesEnabled &&
      (tasksQuery.isFetching ||
        agentsQuery.isFetching ||
        ownerOrdersQuery.isFetching),
    isError: Boolean(error),
    error,
    errorMessage,
    resumeNotice,
    resumeWarning,
    resumingOrderId,
    canResumeTask,
    resumeTask,
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
    refetchAll,
  }
}
