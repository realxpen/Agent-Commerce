"use client"

import Link from "next/link"
import {
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ReceiptText,
  Search,
} from "lucide-react"
import { WalletRouteGuard } from "@/components/guards"
import { SessionApprovalCard } from "@/components/session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SkeletonBlock, StatusNoticeCard } from "@/components/states"
import { useCustomerOrdersDirectory } from "@/hooks/orders"

function getStatusTone(value: string): "success" | "warning" | "destructive" | "outline" {
  if (
    value === "COMPLETED" ||
    value === "DELIVERED" ||
    value === "PAID" ||
    value === "ADDRESSED"
  ) {
    return "success"
  }

  if (
    value === "PENDING" ||
    value === "IN_PROGRESS" ||
    value === "OPEN" ||
    value === "ADDRESSING"
  ) {
    return "warning"
  }

  if (value === "FAILED" || value === "CANCELLED") {
    return "destructive"
  }

  return "outline"
}

export default function OrdersPage() {
  const orders = useCustomerOrdersDirectory()

  return (
    <WalletRouteGuard
      title="Connect your account to review live orders"
      description="Order history, deliveries, and revision requests are tied to your wallet and backend session."
      secondaryHref="/marketplace"
      secondaryLabel="Explore Marketplace"
    >
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">
            <ReceiptText className="h-3.5 w-3.5" />
            Client Orders
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">
              Review deliveries and request changes
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/40">
              Every live order you place appears here, including delivery state,
              payment progress, and revision follow-up.
            </p>
          </div>
        </div>

        {!orders.auth.isAuthenticated ? (
          <StatusNoticeCard
            tone="warning"
            title="Unlock backend sync to load your order history"
            description="The order list is scoped to your backend session. Use the sync card in the sidebar once, then this page will refresh automatically."
          />
        ) : null}

        {orders.recoveryNotice ? (
          <StatusNoticeCard
            tone="success"
            title="Recovered older payment sync"
            description={orders.recoveryNotice}
          />
        ) : null}

        {orders.recoveryWarning ? (
          <StatusNoticeCard
            tone="warning"
            title="Some older orders still need another refresh"
            description={orders.recoveryWarning}
          />
        ) : null}

        {orders.isError && orders.errorMessage ? (
          <StatusNoticeCard
            tone="danger"
            title="Order history is temporarily unavailable"
            description={orders.errorMessage}
            actionLabel="Retry"
            onAction={() => orders.refetch().then(() => undefined)}
            isActionLoading={orders.isFetching}
          />
        ) : null}

        <Card className="glass-card border-white/5 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
              <Input
                className="h-11 rounded-xl border-white/10 bg-white/5 pl-9"
                placeholder="Search by service, agent, order ID, or payment reference"
                value={orders.searchQuery}
                onChange={(event) => orders.setSearchQuery(event.target.value)}
              />
            </div>
            <select
              value={orders.statusFilter}
              onChange={(event) =>
                orders.setStatusFilter(
                  event.target.value as typeof orders.statusFilter,
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DELIVERED">Delivered</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {orders.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-[126px] glass-card" />
              ))
            : [
                {
                  label: "Review Ready",
                  value: orders.reviewReadyCount.toString(),
                  icon: CheckCircle2,
                },
                {
                  label: "In Progress",
                  value: orders.inProgressCount.toString(),
                  icon: Clock3,
                },
                {
                  label: "Completed",
                  value: orders.completedCount.toString(),
                  icon: Bot,
                },
              ].map((card) => (
                <Card key={card.label} className="glass-card border-white/5 p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-white/40">
                      {card.label}
                    </span>
                    <card.icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h3 className="text-3xl font-display font-bold">{card.value}</h3>
                </Card>
              ))}
        </div>

        <div className="space-y-4">
          {orders.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-[172px] glass-card" />
            ))
          ) : orders.orders.length > 0 ? (
            orders.orders.map((order) => (
              <Card key={order.id} className="glass-card border-white/5 p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={getStatusTone(order.lifecycleStatus)}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      >
                        {order.lifecycleStatus}
                      </Badge>
                      <Badge
                        variant={getStatusTone(order.deliveryStatus)}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Delivery {order.deliveryStatus}
                      </Badge>
                      <Badge
                        variant={getStatusTone(order.paymentStatus)}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Payment {order.paymentStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {order.serviceTitle}
                      </p>
                      <p className="mt-1 text-sm text-indigo-300">
                        {order.agentName}
                      </p>
                    </div>
                    <p className="text-sm text-white/50">{order.nextStepLabel}</p>
                  </div>

                  <div className="grid min-w-[260px] gap-4 sm:grid-cols-2 lg:min-w-[320px]">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                        Amount
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {order.amountLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                        Created
                      </p>
                      <p className="mt-2 text-sm text-white/65">
                        {order.createdLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                        Last Updated
                      </p>
                      <p className="mt-2 text-sm text-white/65">
                        {order.updatedLabel}
                      </p>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button asChild className="w-full sm:w-auto">
                        <Link href={`/orders/${order.id}?role=customer`}>
                          {order.lifecycleStatus === "DELIVERED" && !order.hasOpenRevision
                            ? "Review Order"
                            : "Open Order"}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="glass-card rounded-3xl border-white/5 p-12 text-center">
              <p className="text-white/40">
                {orders.hasAnyData
                  ? "No orders match those filters."
                  : "You do not have any live orders yet."}
              </p>
              <Button asChild variant="link" className="mt-2 text-indigo-400">
                <Link href="/marketplace">Browse marketplace</Link>
              </Button>
            </div>
          )}
        </div>

        <SessionApprovalCard compact surface="dashboard" />
      </div>
    </WalletRouteGuard>
  )
}
