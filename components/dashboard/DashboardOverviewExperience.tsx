"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import {
  Activity,
  ArrowRight,
  ArrowRightLeft,
  Bot,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  DollarSign,
  PlusCircle,
  RefreshCcw,
  Sparkles,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  AgentDto,
  DashboardStatsDto,
  TaskDto,
  TransactionDto,
} from "@/lib/api/types"
import type {
  DashboardActivityItem,
  DashboardBackendNotice,
} from "@/hooks/dashboard"
import { cn } from "@/lib/utils"

type OverviewMetric = {
  id: string
  label: string
  value: string
  accent: string
  caption: string
  icon: ComponentType<{ className?: string }>
}

type AgentRuntimeStatus = {
  id: string
  agentName: string
  subtitle: string
  stateLabel: string
  tone: "success" | "warning" | "danger" | "neutral"
}

const noticeToneStyles = {
  neutral: "border-white/10 bg-white/[0.03] text-white/75",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-100",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-100",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
} as const

const runtimeToneStyles = {
  success: {
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    bar: "bg-emerald-400",
  },
  warning: {
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    bar: "bg-amber-400",
  },
  danger: {
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    bar: "bg-rose-400",
  },
  neutral: {
    badge: "border-white/10 bg-white/[0.04] text-white/65",
    bar: "bg-white/25",
  },
} as const

function toNumber(value: string | null | undefined) {
  if (!value) {
    return 0
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: string | null | undefined, denom: string | null | undefined) {
  const parsed = toNumber(value)
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(parsed)

  return denom ? `${formatted} ${denom}` : formatted
}

function formatInteger(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatPercentDelta(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%"
  }

  const delta = ((current - previous) / Math.abs(previous)) * 100
  const rounded = Math.round(delta * 10) / 10
  return `${rounded >= 0 ? "+" : ""}${rounded}%`
}

function buildRevenueDelta(stats: DashboardStatsDto | null) {
  const trends = stats?.trends ?? []
  if (trends.length < 2) {
    return {
      accent: "+0%",
      caption: stats?.treasury.denom
        ? `Settled in ${stats.treasury.denom}`
        : "Live workspace total",
    }
  }

  const previous = toNumber(trends[trends.length - 2]?.netRevenue)
  const current = toNumber(trends[trends.length - 1]?.netRevenue)

  return {
    accent: formatPercentDelta(current, previous),
    caption: stats?.treasury.denom
      ? `Net revenue in ${stats.treasury.denom}`
      : "Live workspace total",
  }
}

function buildTaskSuccessCaption(tasks: TaskDto[]) {
  if (tasks.length === 0) {
    return {
      accent: "+0%",
      caption: "No indexed runs yet",
    }
  }

  const succeeded = tasks.filter((task) => task.status === "SUCCEEDED").length
  const rate = Math.round((succeeded / tasks.length) * 100)

  return {
    accent: `+${rate}%`,
    caption: "recent success rate",
  }
}

function buildClientCount(tasks: TaskDto[], transactions: TransactionDto[]) {
  const customerIds = new Set<string>()

  for (const transaction of transactions) {
    if (transaction.order.customerId) {
      customerIds.add(transaction.order.customerId)
    }
  }

  for (const task of tasks) {
    const customerId = task.order?.customer.id
    if (customerId) {
      customerIds.add(customerId)
    }
  }

  return customerIds.size
}

function buildOverviewMetrics(input: {
  stats: DashboardStatsDto | null
  agents: AgentDto[]
  tasks: TaskDto[]
  transactions: TransactionDto[]
  recentActivity: DashboardActivityItem[]
}): OverviewMetric[] {
  const revenueDelta = buildRevenueDelta(input.stats)
  const taskMetric = buildTaskSuccessCaption(input.tasks)
  const activeAgents = input.stats?.totals.activeAgents ??
    input.agents.filter((agent) => agent.status === "ACTIVE").length
  const runningAgents = new Set(
    input.tasks
      .filter(
        (task) =>
          task.status === "RUNNING" ||
          task.status === "QUEUED" ||
          task.status === "RETRYING",
      )
      .map((task) => task.order?.agent.id ?? task.agentTask.agentId),
  ).size
  const uniqueClients = buildClientCount(input.tasks, input.transactions)

  return [
    {
      id: "total_revenue",
      label: "Total Revenue",
      value: formatMoney(input.stats?.totals.netRevenue, input.stats?.treasury.denom),
      accent: revenueDelta.accent,
      caption: revenueDelta.caption,
      icon: DollarSign,
    },
    {
      id: "active_agents",
      label: "Active Agents",
      value: formatInteger(activeAgents),
      accent: `+${runningAgents}`,
      caption: runningAgents > 0 ? "running tasks now" : "ready for new work",
      icon: Bot,
    },
    {
      id: "tasks_completed",
      label: "Tasks Completed",
      value: formatInteger(input.stats?.totals.totalTasks ?? input.tasks.length),
      accent: taskMetric.accent,
      caption: taskMetric.caption,
      icon: Activity,
    },
    {
      id: "unique_clients",
      label: "Unique Clients",
      value: formatInteger(uniqueClients),
      accent: `+${input.recentActivity.length}`,
      caption:
        input.recentActivity.length > 0
          ? "signals in live activity"
          : "waiting for first order flow",
      icon: Users,
    },
  ]
}

function buildRuntimeStatuses(agents: AgentDto[], tasks: TaskDto[]): AgentRuntimeStatus[] {
  const latestTaskByAgent = new Map<string, TaskDto>()

  for (const task of [...tasks].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt ?? left.createdAt)
    const rightTime = Date.parse(right.updatedAt ?? right.createdAt)
    return rightTime - leftTime
  })) {
    const agentId = task.order?.agent.id ?? task.agentTask.agentId
    if (!latestTaskByAgent.has(agentId)) {
      latestTaskByAgent.set(agentId, task)
    }
  }

  return [...agents]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 3)
    .map((agent) => {
      const latestTask = latestTaskByAgent.get(agent.id)

      if (agent.status !== "ACTIVE") {
        return {
          id: agent.id,
          agentName: agent.name,
          subtitle: `${agent.serviceCount} service${agent.serviceCount === 1 ? "" : "s"} live`,
          stateLabel: agent.status,
          tone: "neutral" as const,
        }
      }

      if (!latestTask) {
        return {
          id: agent.id,
          agentName: agent.name,
          subtitle: `${agent.orderCount} order${agent.orderCount === 1 ? "" : "s"} indexed`,
          stateLabel: "DEPLOYED",
          tone: "success" as const,
        }
      }

      if (latestTask.status === "FAILED" || latestTask.status === "TIMED_OUT") {
        return {
          id: agent.id,
          agentName: agent.name,
          subtitle: "Latest task needs attention",
          stateLabel: "FAILED",
          tone: "danger" as const,
        }
      }

      if (
        latestTask.status === "RUNNING" ||
        latestTask.status === "QUEUED" ||
        latestTask.status === "RETRYING"
      ) {
        return {
          id: agent.id,
          agentName: agent.name,
          subtitle: "Working on a live fulfillment run",
          stateLabel: "DEPLOYING",
          tone: "warning" as const,
        }
      }

      return {
        id: agent.id,
        agentName: agent.name,
        subtitle:
          latestTask.status === "SUCCEEDED"
            ? "Latest task completed cleanly"
            : `${agent.orderCount} order${agent.orderCount === 1 ? "" : "s"} indexed`,
        stateLabel: "DEPLOYED",
        tone: "success" as const,
      }
    })
}

function buildChartPaths(trends: DashboardStatsDto["trends"]) {
  if (trends.length === 0) {
    return { line: "", area: "" }
  }

  const values = trends.map((trend) => Math.max(0, toNumber(trend.netRevenue)))
  const maxValue = Math.max(...values, 1)
  const width = 100
  const height = 100

  const points = values.map((value, index) => {
    const x = trends.length === 1 ? width / 2 : (index / (trends.length - 1)) * width
    const y = height - (value / maxValue) * 76 - 12
    return { x, y }
  })

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
  const area = `${line} L ${points[points.length - 1]?.x ?? width} ${height} L ${points[0]?.x ?? 0} ${height} Z`

  return { line, area }
}

function RevenueChart({
  stats,
  isLoading,
}: {
  stats: DashboardStatsDto | null
  isLoading: boolean
}) {
  const trends = stats?.trends ?? []
  const { line, area } = buildChartPaths(trends)

  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-xl font-display font-bold">
            Revenue Performance
          </CardTitle>
          <p className="mt-2 text-sm text-white/45">
            Daily earnings across all active agents.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">
          <span className="h-2 w-2 rounded-full bg-indigo-400" />
          Revenue
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-[280px] animate-pulse rounded-[28px] border border-white/5 bg-white/[0.03]" />
        ) : trends.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] text-center">
            <div className="max-w-sm">
              <p className="font-semibold text-white">Waiting for revenue history</p>
              <p className="mt-2 text-sm text-white/45">
                Settled payments will start drawing this chart as live order flow lands.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/5 bg-[#070707] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Net</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatMoney(stats?.totals.netRevenue, stats?.treasury.denom)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Gross</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatMoney(stats?.totals.grossRevenue, stats?.treasury.denom)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Pending</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatMoney(stats?.totals.pendingRevenue, stats?.treasury.denom)}
                </p>
              </div>
            </div>

            <div className="relative mt-5 h-[190px] overflow-hidden rounded-[26px] border border-white/5 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent">
              <div className="absolute inset-0">
                {[18, 40, 62, 84].map((top) => (
                  <div
                    key={top}
                    className="absolute left-0 right-0 border-t border-white/[0.04]"
                    style={{ top: `${top}%` }}
                  />
                ))}
              </div>

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                <defs>
                  <linearGradient id="overviewRevenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(99, 102, 241, 0.45)" />
                    <stop offset="100%" stopColor="rgba(99, 102, 241, 0.02)" />
                  </linearGradient>
                </defs>
                {area ? <path d={area} fill="url(#overviewRevenueFill)" /> : null}
                {line ? (
                  <path
                    d={line}
                    fill="none"
                    stroke="rgb(99 102 241)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}
              </svg>

              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/28">
                <span>{trends[0]?.label ?? "Start"}</span>
                <span>{trends[trends.length - 1]?.label ?? "Now"}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityRail({
  items,
  isLoading,
}: {
  items: DashboardActivityItem[]
  isLoading: boolean
}) {
  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-display font-bold">
            Live Activity
          </CardTitle>
          <p className="mt-2 text-sm text-white/45">
            Real-time agent task stream.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-white/20" />
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[72px] animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
            />
          ))
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6">
            <p className="font-semibold text-white">No live activity yet</p>
            <p className="mt-2 text-sm text-white/45">
              Payments and task events will start appearing here after the first live order.
            </p>
          </div>
        ) : (
          items.slice(0, 5).map((item) => {
            const isPayment = item.kind === "payment"

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-indigo-500/10">
                    {isPayment ? (
                      <ArrowRightLeft className="h-4 w-4 text-indigo-300" />
                    ) : (
                      <Bot className="h-4 w-4 text-indigo-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-white/40">{item.description}</p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {item.amountLabel ? (
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        item.tone === "success"
                          ? "text-emerald-300"
                          : item.tone === "warning"
                            ? "text-amber-300"
                            : item.tone === "destructive"
                              ? "text-rose-300"
                              : "text-white",
                      )}
                    >
                      {item.amountLabel}
                    </p>
                  ) : (
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                      {item.kind}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/25">
                    {item.timeLabel}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function AgentStatusStrip({
  items,
  isLoading,
}: {
  items: AgentRuntimeStatus[]
  isLoading: boolean
}) {
  return (
    <Card className="glass-card border-white/5">
      <CardHeader>
        <CardTitle className="text-xl font-display font-bold">
          Agent Deployment Status
        </CardTitle>
        <p className="mt-2 text-sm text-white/45">
          Real-time status of your AI agent deployments on the Initia workspace.
        </p>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[88px] animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6">
            <p className="font-semibold text-white">No agents indexed yet</p>
            <p className="mt-2 text-sm text-white/45">
              Create an agent to start filling this deployment strip.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/5 bg-[#080808] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-indigo-500/10">
                      <Bot className="h-4 w-4 text-indigo-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {item.agentName}
                      </p>
                      <p className="mt-1 truncate text-xs text-white/40">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.18em]",
                      runtimeToneStyles[item.tone].badge,
                    )}
                  >
                    {item.stateLabel}
                  </Badge>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      runtimeToneStyles[item.tone].bar,
                    )}
                    style={{
                      width:
                        item.tone === "success"
                          ? "100%"
                          : item.tone === "warning"
                            ? "46%"
                            : item.tone === "danger"
                              ? "22%"
                              : "34%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardOverviewExperience({
  stats,
  agents,
  tasks,
  transactions,
  recentActivity,
  backendNotice,
  isLoading,
  isRefreshing,
  onRefresh,
}: {
  stats: DashboardStatsDto | null
  agents: AgentDto[]
  tasks: TaskDto[]
  transactions: TransactionDto[]
  recentActivity: DashboardActivityItem[]
  backendNotice: DashboardBackendNotice
  isLoading: boolean
  isRefreshing: boolean
  onRefresh: () => void | Promise<void>
}) {
  const metrics = buildOverviewMetrics({
    stats,
    agents,
    tasks,
    transactions,
    recentActivity,
  })
  const runtimeStatuses = buildRuntimeStatuses(agents, tasks)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <Badge className="border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-300">
            Workspace Overview
          </Badge>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-display font-bold tracking-tight text-white">
                Workspace Overview
              </h1>
              <Sparkles className="h-5 w-5 text-indigo-300" />
            </div>
            <p className="max-w-2xl text-white/45">
              Follow live revenue, task throughput, client flow, and agent runtime
              health from one command surface.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-10 border-white/10 bg-white/5"
            onClick={() => void onRefresh()}
          >
            <RefreshCcw
              className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button asChild className="h-10">
            <Link href="/dashboard/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Agent
            </Link>
          </Button>
        </div>
      </div>

      <Card className="glass-card border-white/5">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                backendNotice.tone === "danger"
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                  : backendNotice.tone === "warning"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
              )}
            >
              {backendNotice.tone === "danger" ? (
                <CircleAlert className="h-4 w-4" />
              ) : (
                <CircleCheckBig className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="font-semibold text-white">{backendNotice.title}</p>
              <p className="mt-1 text-sm text-white/50">{backendNotice.description}</p>
            </div>
          </div>

          <div
            className={cn(
              "rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]",
              noticeToneStyles[backendNotice.tone],
            )}
          >
            {backendNotice.tone === "success"
              ? "Live"
              : backendNotice.tone === "warning"
                ? "Needs Attention"
                : backendNotice.tone === "danger"
                  ? "Degraded"
                  : "Standby"}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon

          return (
            <Card key={metric.id} className="glass-card border-white/5">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">
                      {metric.label}
                    </p>
                    <p className="mt-3 text-3xl font-display font-bold text-white">
                      {isLoading ? "..." : metric.value}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03]">
                    <Icon className="h-4 w-4 text-white/25" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-emerald-300">
                    {isLoading ? "+0%" : metric.accent}
                  </span>
                  <span className="text-xs text-white/35">{metric.caption}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <RevenueChart stats={stats} isLoading={isLoading} />
        <ActivityRail items={recentActivity} isLoading={isLoading} />
      </div>

      <AgentStatusStrip items={runtimeStatuses} isLoading={isLoading} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card className="glass-card border-white/5">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">
                Quick Actions
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                Move from overview straight into creation or operations.
              </p>
              <p className="mt-2 max-w-xl text-sm text-white/45">
                Use this surface as the starting point for agent creation, live task
                monitoring, and treasury follow-through.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-white/10 bg-white/5">
                <Link href="/dashboard/tasks">
                  Open Tasks
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/10 bg-white/5">
                <Link href="/dashboard/treasury">
                  Open Treasury
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/services/new">
                  Create Service
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
                <Clock3 className="h-4 w-4 text-indigo-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Operational Pulse</p>
                <p className="text-xs text-white/40">
                  A compact read on what matters right now.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">
                  Available Balance
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatMoney(stats?.treasury.availableBalance, stats?.treasury.denom)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">
                  Pending Escrow
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatMoney(stats?.treasury.pendingBalance, stats?.treasury.denom)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
