"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  History,
  Search,
  Terminal,
  Zap,
} from "lucide-react"
import { WalletRouteGuard } from "@/components/guards"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SessionApprovalCard } from "@/components/session"
import { SkeletonBlock, StatusNoticeCard } from "@/components/states"
import { useDashboardTasks } from "@/hooks/dashboard"
import { cn } from "@/lib/utils"

function TaskCard({
  task,
  onClick,
}: {
  task: ReturnType<typeof useDashboardTasks>["tasks"][number]
  onClick: () => void
}) {
  return (
    <Card
      className="glass-card cursor-pointer border-white/5 p-6 transition-all group hover:border-indigo-500/30 hover:bg-white/[0.04]"
      onClick={onClick}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex min-w-[200px] items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
            <Bot className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold">{task.agent}</h4>
            <p className="font-mono text-[11px] text-white/40">{task.id}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              {task.client}
            </span>
          </div>
          <h3 className="truncate text-sm font-medium">{task.task}</h3>
          {task.amountLabel ? (
            <p className="mt-2 text-xs text-white/35">{task.amountLabel}</p>
          ) : null}
        </div>

        <div className="w-full space-y-2 lg:w-48">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
            <span className="text-white/40">Progress</span>
            <span className="text-white/60">{task.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                task.status === "SUCCEEDED"
                  ? "bg-emerald-500"
                  : task.status === "FAILED" ||
                      task.status === "TIMED_OUT" ||
                      task.status === "CANCELED"
                    ? "bg-rose-500"
                    : "bg-indigo-500",
              )}
            />
          </div>
        </div>

        <div className="flex min-w-[150px] items-center justify-between gap-6 lg:justify-end">
          <div className="flex flex-col items-end">
            <Badge
              variant={
                task.status === "SUCCEEDED"
                  ? "success"
                  : task.status === "FAILED" ||
                      task.status === "TIMED_OUT" ||
                      task.status === "CANCELED"
                    ? "destructive"
                    : "warning"
              }
              className="mb-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
            >
              {task.status.toLowerCase()}
            </Badge>
            <span className="flex items-center gap-1 text-[10px] text-white/20">
              <Clock className="h-3 w-3" />
              {task.date}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/40 group-hover:bg-white/5 group-hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default function TasksPage() {
  const tasks = useDashboardTasks()

  return (
    <WalletRouteGuard
      title="Connect your account to inspect live task runs"
      description="Task execution is tied to your workspace. Connect and switch to the AgentCommerce appchain to load live runs."
      secondaryHref="/marketplace"
      secondaryLabel="Explore Marketplace"
    >
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-1 text-3xl font-display font-bold tracking-tight">
                Tasks & Activity
              </h1>
              <p className="text-sm text-white/40">
                Monitor live task runs, retries, and delivery work for your agents.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className={cn(
                  "h-11 border-white/5 bg-white/5 hover:bg-white/10",
                  tasks.isFilterOpen && "border-indigo-500/50 bg-indigo-500/5",
                )}
                onClick={() => tasks.setIsFilterOpen(!tasks.isFilterOpen)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {tasks.activeFiltersCount > 0 ? (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {tasks.activeFiltersCount}
                  </span>
                ) : null}
              </Button>
              <Button
                variant="outline"
                className="h-11 border-white/5 bg-white/5 hover:bg-white/10"
                onClick={() => void tasks.clearFilters()}
              >
                Reset
              </Button>
            </div>
          </div>

          {!tasks.auth.isAuthenticated ? (
            <StatusNoticeCard
              tone="warning"
              title="Unlock backend sync to load live task activity"
              description="Your wallet is connected, but task runs stay private to your backend session. Use the sidebar sync card once, then this page will populate automatically."
            />
          ) : null}

          {tasks.recoveryNotice ? (
            <StatusNoticeCard
              tone="success"
              title="Recovered older payment sync"
              description={tasks.recoveryNotice}
            />
          ) : null}

          {tasks.recoveryWarning ? (
            <StatusNoticeCard
              tone="warning"
              title="Some older orders still need another refresh"
              description={tasks.recoveryWarning}
            />
          ) : null}

          {tasks.resumeNotice ? (
            <StatusNoticeCard
              tone="success"
              title="Fulfillment resumed"
              description={tasks.resumeNotice}
            />
          ) : null}

          {tasks.resumeWarning ? (
            <StatusNoticeCard
              tone="warning"
              title="Could not resume fulfillment"
              description={tasks.resumeWarning}
            />
          ) : null}

          {tasks.isError && tasks.errorMessage ? (
            <StatusNoticeCard
              tone="danger"
              title="Task activity is temporarily unavailable"
              description={tasks.errorMessage}
              actionLabel="Retry"
              onAction={() => tasks.refetchAll()}
              isActionLoading={tasks.isFetching}
            />
          ) : null}

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-indigo-400" />
            <Input
              placeholder="Search by task, agent name, customer, or task ID..."
              value={tasks.searchQuery}
              onChange={(event) => tasks.setSearchQuery(event.target.value)}
              className="h-14 rounded-2xl border-white/5 bg-white/5 pl-12 text-lg transition-all focus:border-indigo-500/50 focus:ring-indigo-500/20"
            />
          </div>

          {tasks.isFilterOpen ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
            >
              <Card className="glass-card grid grid-cols-1 gap-6 border-white/5 p-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Status
                  </label>
                  <select
                    value={tasks.statusFilter}
                    onChange={(event) =>
                      tasks.setStatusFilter(event.target.value as typeof tasks.statusFilter)
                    }
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white transition-colors hover:bg-white/10 focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="QUEUED">Queued</option>
                    <option value="RUNNING">Running</option>
                    <option value="RETRYING">Retrying</option>
                    <option value="SUCCEEDED">Succeeded</option>
                    <option value="FAILED">Failed</option>
                    <option value="TIMED_OUT">Timed Out</option>
                    <option value="CANCELED">Canceled</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Agent
                  </label>
                  <select
                    value={tasks.agentFilter}
                    onChange={(event) => tasks.setAgentFilter(event.target.value)}
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white transition-colors hover:bg-white/10 focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="all">All Agents</option>
                    {tasks.agentNames.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Timeframe
                  </label>
                  <select
                    value={tasks.dateRange}
                    onChange={(event) =>
                      tasks.setDateRange(event.target.value as typeof tasks.dateRange)
                    }
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white transition-colors hover:bg-white/10 focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>
              </Card>
            </motion.div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {tasks.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-[128px] glass-card" />
              ))
            : [
                {
                  label: "Active Tasks",
                  value: tasks.activeTaskCount.toString(),
                  icon: Activity,
                  color: "text-indigo-400",
                },
                {
                  label: "Completed Tasks",
                  value: tasks.completedTaskCount.toString(),
                  icon: CheckCircle2,
                  color: "text-emerald-400",
                },
                {
                  label: "Failed Tasks",
                  value: tasks.failedTaskCount.toString(),
                  icon: AlertCircle,
                  color: "text-rose-400",
                },
              ].map((stat) => (
                <Card key={stat.label} className="glass-card border-white/5 p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-white/40">
                      {stat.label}
                    </span>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <h3 className="text-3xl font-display font-bold">{stat.value}</h3>
                </Card>
              ))}
        </div>

        <div className="space-y-4">
          {tasks.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-[124px] glass-card" />
            ))
          ) : tasks.tasks.length > 0 ? (
            tasks.tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <TaskCard
                  task={task}
                  onClick={() => tasks.setSelectedTaskId(task.id)}
                />
              </motion.div>
            ))
          ) : (
            <div className="glass-card rounded-3xl border-white/5 p-12 text-center">
              <p className="text-white/40">
                {tasks.hasAnyData
                  ? "No task runs match those filters."
                  : "No live task runs have been indexed for this workspace yet."}
              </p>
              <Button
                variant="link"
                className="mt-2 text-indigo-400"
                onClick={() => void tasks.clearFilters()}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>

        <SessionApprovalCard compact surface="dashboard" />

        <Dialog
          open={Boolean(tasks.selectedTask)}
          onOpenChange={(open) => {
            if (!open) {
              tasks.setSelectedTaskId(null)
            }
          }}
        >
          <DialogContent className="max-w-2xl overflow-hidden border-white/10 bg-[#050505] p-0">
            <DialogHeader className="border-b border-white/5 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
                  <Bot className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {tasks.selectedTask?.agent}
                  </DialogTitle>
                  <DialogDescription className="font-mono text-xs text-indigo-400">
                    {tasks.selectedTask?.id}
                  </DialogDescription>
                </div>
                {tasks.selectedTask ? (
                  <Badge
                    variant={
                      tasks.selectedTask.status === "SUCCEEDED"
                        ? "success"
                        : tasks.selectedTask.status === "FAILED" ||
                            tasks.selectedTask.status === "TIMED_OUT" ||
                            tasks.selectedTask.status === "CANCELED"
                          ? "destructive"
                          : "warning"
                    }
                    className="ml-auto px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                  >
                    {tasks.selectedTask.status.toLowerCase()}
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Task Description
                </p>
                <p className="text-sm text-white/80">{tasks.selectedTask?.task}</p>
              </div>
            </DialogHeader>

            <div className="max-h-[60vh] space-y-8 overflow-y-auto scrollbar-hide p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40">
                  <Terminal className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">
                    Execution Logs
                  </h3>
                </div>
                <div className="space-y-2 rounded-xl border border-white/5 bg-black/50 p-4 font-mono text-xs">
                  {tasks.selectedTask?.logs.map((log, index) => (
                    <div key={index} className="flex gap-4">
                      <span className="shrink-0 text-white/20">{log.time}</span>
                      <span
                        className={cn(
                          log.type === "error"
                            ? "text-rose-400"
                            : log.type === "success"
                              ? "text-emerald-400"
                              : log.type === "warning"
                                ? "text-amber-400"
                                : "text-white/60",
                        )}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {tasks.selectedTask?.outputPreview ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-white/40">
                    <Activity className="h-4 w-4" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">
                      Output Preview
                    </h3>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/50 p-4">
                    <pre className="whitespace-pre-wrap break-words text-xs text-white/65">
                      {tasks.selectedTask.outputPreview}
                    </pre>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40">
                  <History className="h-4 w-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">
                    Event History
                  </h3>
                </div>
                <div className="space-y-3">
                  {tasks.selectedTask?.history.map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        <span className="text-sm font-medium">{event.event}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px]">
                        <span className="text-white/40">{event.user}</span>
                        <span className="text-white/20">{event.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">
                    Customer
                  </p>
                  <p className="text-sm font-medium">{tasks.selectedTask?.client}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">
                    Last Updated
                  </p>
                  <p className="text-sm font-medium">{tasks.selectedTask?.date}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/5 bg-white/[0.02] p-6">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5"
                onClick={() => tasks.setSelectedTaskId(null)}
              >
                Close
              </Button>
              {tasks.canResumeTask(tasks.selectedTask) ? (
                <Button
                  variant="outline"
                  className="border-indigo-500/30 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20"
                  disabled={
                    !tasks.selectedTask?.orderId ||
                    tasks.resumingOrderId === tasks.selectedTask.orderId
                  }
                  onClick={() => void tasks.resumeTask(tasks.selectedTask)}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {tasks.selectedTask?.orderId &&
                  tasks.resumingOrderId === tasks.selectedTask.orderId
                    ? "Resuming..."
                    : "Resume Fulfillment"}
                </Button>
              ) : null}
              {tasks.selectedTask?.orderId ? (
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                  <Link href={`/orders/${tasks.selectedTask.orderId}?role=agent_owner`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Order
                  </Link>
                </Button>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WalletRouteGuard>
  )
}
