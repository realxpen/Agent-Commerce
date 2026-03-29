"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { WalletRouteGuard } from "@/components/guards"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SessionApprovalCard } from "@/components/session"
import { SkeletonBlock, StatusNoticeCard } from "@/components/states"
import { useDashboardTreasury } from "@/hooks/dashboard"
import { cn } from "@/lib/utils"

const statIcons = [Wallet, DollarSign, ArrowUpRight, CreditCard]
const statIconColors = [
  "text-emerald-400",
  "text-amber-400",
  "text-indigo-400",
  "text-purple-400",
]

export default function TreasuryPage() {
  const treasury = useDashboardTreasury()

  return (
    <WalletRouteGuard
      title="Connect your account to inspect treasury activity"
      description="Treasury balances and payment history load from your live workspace after wallet connection and backend sync."
      secondaryHref="/marketplace"
      secondaryLabel="Explore Marketplace"
    >
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-display font-bold tracking-tight">
              Treasury
            </h1>
            <p className="text-sm text-white/40">
              Follow live balances, settlement flow, and recent payment activity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-white/5 bg-white/5 hover:bg-white/10"
              onClick={() => treasury.exportCsv()}
              disabled={treasury.transactions.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              className="bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:bg-indigo-700"
              disabled
              title="Treasury withdrawals are not wired to the live appchain flow yet."
            >
              Withdrawals not wired
            </Button>
          </div>
        </div>

        {!treasury.auth.isAuthenticated ? (
          <StatusNoticeCard
            tone="warning"
            title="Unlock backend sync to load your treasury"
            description="Treasury balances and payment history are scoped to your backend session. Use the sync card in the sidebar once, then this page will populate with live data."
          />
        ) : null}

        {treasury.recoveryNotice ? (
          <StatusNoticeCard
            tone="success"
            title="Recovered older payment sync"
            description={treasury.recoveryNotice}
          />
        ) : null}

        {treasury.recoveryWarning ? (
          <StatusNoticeCard
            tone="warning"
            title="Some older orders still need another refresh"
            description={treasury.recoveryWarning}
          />
        ) : null}

        {treasury.isError && treasury.errorMessage ? (
          <StatusNoticeCard
            tone="danger"
            title="Treasury data is temporarily unavailable"
            description={treasury.errorMessage}
            actionLabel="Retry"
            onAction={() => treasury.refetchAll()}
            isActionLoading={treasury.isFetching}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {treasury.isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-[152px] glass-card" />
              ))
            : treasury.statCards.map((stat, index) => {
                const Icon = statIcons[index]
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <Card className="glass-card border-white/5 p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <div
                          className={cn(
                            "rounded-lg bg-white/5 p-2",
                            statIconColors[index],
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/50">
                          {stat.change}
                        </span>
                      </div>
                      <p className="mb-1 text-sm font-medium text-white/40">
                        {stat.label}
                      </p>
                      <h3 className="text-2xl font-display font-bold">
                        {stat.value}
                      </h3>
                    </Card>
                  </motion.div>
                )
              })}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <Card className="glass-card overflow-hidden border-white/5 lg:col-span-2">
            <div className="flex flex-col gap-4 border-b border-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-display font-bold">
                Recent Transactions
              </h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  <Input
                    placeholder="Search transactions..."
                    value={treasury.searchQuery}
                    onChange={(event) => treasury.setSearchQuery(event.target.value)}
                    className="h-9 w-64 border-white/5 bg-white/5 pl-9 text-sm transition-all focus:border-indigo-500/50"
                  />
                </div>
                <select
                  value={treasury.statusFilter}
                  onChange={(event) =>
                    treasury.setStatusFilter(
                      event.target.value as typeof treasury.statusFilter,
                    )
                  }
                  className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="INITIATED">Initiated</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/20">
                    <th className="px-6 py-4">Transaction</th>
                    <th className="px-6 py-4">Agent / Service</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {treasury.isLoading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={6} className="px-6 py-4">
                            <SkeletonBlock className="h-12" />
                          </td>
                        </tr>
                      ))
                    : treasury.transactions.map((transaction) => (
                        <tr
                          key={transaction.paymentId}
                          className="group transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-xs text-white/60">
                                {transaction.id}
                              </span>
                              <span className="mt-1 text-[11px] text-white/35">
                                {transaction.paymentId}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {transaction.agent}
                              </span>
                              <span className="text-[11px] text-white/40">
                                {transaction.client}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                transaction.type === "income"
                                  ? "text-emerald-400"
                                  : transaction.type === "failed"
                                    ? "text-rose-400"
                                    : "text-amber-400",
                              )}
                            >
                              {transaction.amount}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={transaction.tone}
                              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                            >
                              {transaction.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-white/40">
                              {transaction.date}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-white/20 group-hover:bg-white/5 group-hover:text-white"
                            >
                              <Link href={`/orders/${transaction.orderId}?role=agent_owner`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {!treasury.isLoading && treasury.transactions.length === 0 ? (
              <div className="p-6 text-center text-sm text-white/45">
                No live payment records match the current filters.
              </div>
            ) : null}
          </Card>

          <div className="space-y-6">
            <Card className="glass-card border-white/5 p-6">
              <h2 className="mb-4 text-lg font-display font-bold">
                Revenue by Agent
              </h2>
              {treasury.revenueByAgent.length > 0 ? (
                <div className="space-y-4">
                  {treasury.revenueByAgent.map((agent) => (
                    <div key={agent.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">{agent.name}</span>
                        <span className="font-bold">{agent.amount}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${agent.percentage}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={cn("h-full rounded-full", agent.toneClass)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/50">
                  Confirmed payments will populate the revenue mix after the first live settlements land.
                </p>
              )}
            </Card>

            <Card className="glass-card border-white/5 bg-indigo-600/5 p-6">
              <div className="mb-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <h2 className="text-lg font-display font-bold">
                  Settlement Coverage
                </h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-white/60">
                {treasury.settlementDescription}
              </p>
              <div className="mb-2 text-3xl font-display font-bold text-indigo-400">
                {treasury.settlementCount}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">
                indexed payment records
              </p>
            </Card>
          </div>
        </div>

        <SessionApprovalCard compact surface="dashboard" />
      </div>
    </WalletRouteGuard>
  )
}
