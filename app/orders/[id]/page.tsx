"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import {
  ArrowRightLeft,
  Bot,
  Clock3,
  Package,
  ReceiptText,
  ShieldCheck,
} from "lucide-react"
import { HeaderBackLink } from "@/components/layout/HeaderBackLink"
import { WalletSessionControls } from "@/components/layout/WalletSessionControls"
import { OrderDeliveryPreviewCard } from "@/components/orders/OrderDeliveryPreviewCard"
import { OrderLifecycleTimeline } from "@/components/orders/OrderLifecycleTimeline"
import { OrderNextActionCard } from "@/components/orders/OrderNextActionCard"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useOrderDetail } from "@/hooks/orders"
import type { JsonValue } from "@/lib/api/types"
import { getApiErrorMessage } from "@/lib/api"

function isRecord(value: JsonValue | null | undefined): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readServiceSummary(snapshot: JsonValue) {
  if (!isRecord(snapshot)) {
    return {
      description: null,
    }
  }

  return {
    description:
      typeof snapshot.description === "string" ? snapshot.description : null,
  }
}

function getStatusBadgeTone(
  value: string,
): "success" | "warning" | "destructive" | "outline" {
  if (
    value === "COMPLETED" ||
    value === "PAID" ||
    value === "CONFIRMED" ||
    value === "DELIVERED" ||
    value === "FINALIZED" ||
    value === "SUCCEEDED"
  ) {
    return "success"
  }

  if (
    value === "PENDING" ||
    value === "IN_PROGRESS" ||
    value === "UNCONFIRMED" ||
    value === "CONFIRMING" ||
    value === "INITIATED" ||
    value === "QUEUED" ||
    value === "RUNNING" ||
    value === "RETRYING"
  ) {
    return "warning"
  }

  if (
    value === "FAILED" ||
    value === "CANCELLED" ||
    value === "REFUNDED" ||
    value === "CANCELED" ||
    value === "TIMED_OUT"
  ) {
    return "destructive"
  }

  return "outline"
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const detail = useOrderDetail({
    orderId: params.id,
    searchParams,
  })

  const serviceSummary = detail.order
    ? readServiceSummary(detail.order.service.snapshot)
    : { description: null }

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <HeaderBackLink href="/marketplace" label="Back to Marketplace" />
          <WalletSessionControls surface="checkout" showRemaining />
        </div>
      </header>

      <main className="container mx-auto px-6 pt-32">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]">
          <div className="space-y-8">
            <Card className="glass-card border-white/5">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="border-indigo-500/20 bg-indigo-500/10 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">
                    Order Detail
                  </Badge>
                  <Badge
                    variant={getStatusBadgeTone(detail.lifecycleStatus)}
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  >
                    {detail.lifecycleStatus}
                  </Badge>
                  <Badge
                    variant={getStatusBadgeTone(detail.paymentStatus)}
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  >
                    Payment {detail.paymentStatus}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <CardTitle className="text-3xl font-display font-bold">
                    {detail.serviceTitle}
                  </CardTitle>
                  <p className="text-lg text-indigo-300">{detail.agentName}</p>
                  <p className="max-w-3xl text-white/50">
                    {serviceSummary.description ??
                      "This page keeps the payment, delivery, and next-step flow visible from one place."}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Service Summary
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {detail.serviceTitle}
                  </p>
                  <p className="mt-2 text-sm text-white/45">
                    Agent: {detail.agentName}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Payment
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {detail.amountLabel ?? "Syncing payment details"}
                  </p>
                  <p className="mt-2 text-sm text-white/45">
                    Status: {detail.paymentStatus}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Delivery Status
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {detail.deliveryStatus}
                  </p>
                  <p className="mt-2 text-sm text-white/45">
                    Order status: {detail.lifecycleStatus}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Payment Reference
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">
                    {detail.order?.payment.reference ??
                      detail.primaryTransaction?.paymentReference ??
                      "Will appear as backend indexing catches up"}
                  </p>
                </div>

                {detail.txHash ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                      Transaction Hash
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-white/65">
                      {detail.txHash}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {detail.orderQuery.isError && !detail.isPendingOnly ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                {getApiErrorMessage(detail.orderQuery.error)}
              </div>
            ) : null}

            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl font-display font-bold">
                  <ReceiptText className="h-5 w-5 text-indigo-400" />
                  Order Lifecycle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderLifecycleTimeline
                  status={detail.lifecycleStatus}
                  paymentStatus={detail.paymentStatus}
                  deliveryStatus={detail.deliveryStatus}
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <OrderDeliveryPreviewCard
                deliveryUrl={detail.order?.delivery.url}
                deliveryText={detail.order?.delivery.text}
                deliveredAt={detail.order?.delivery.deliveredAt}
              />

              <Card className="glass-card border-white/5">
                <CardHeader>
                  <CardTitle className="text-xl font-display font-bold">
                    Commerce Transparency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="font-semibold text-white">
                          Clear payment visibility
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          The payment status, transaction hash, and backend order
                          state live together here so the flow feels understandable
                          instead of opaque.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-5 w-5 text-indigo-400" />
                      <div>
                        <p className="font-semibold text-white">
                          Backend indexing catches up after chain confirmation
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          The transaction hash usually appears first, followed by
                          richer lifecycle and delivery updates once indexing
                          finishes.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl font-display font-bold">
                  <ArrowRightLeft className="h-5 w-5 text-indigo-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {detail.primaryTransaction ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                      Latest Payment Update
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {detail.primaryTransaction.amount}{" "}
                      {detail.primaryTransaction.currency ??
                        detail.primaryTransaction.denom}
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      {detail.primaryTransaction.status} /{" "}
                      {detail.primaryTransaction.confirmationStatus}
                    </p>
                  </div>
                ) : null}

                {detail.tasks.length > 0 ? (
                  <div className="space-y-3">
                    {detail.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-white">
                              {task.agentTask.name}
                            </p>
                            <p className="mt-1 text-sm text-white/45">
                              {task.status} - Attempt {task.attemptNumber} of{" "}
                              {task.maxAttempts}
                            </p>
                          </div>
                          <Badge
                            variant={getStatusBadgeTone(task.status)}
                            className="text-[10px] font-bold uppercase tracking-[0.18em]"
                          >
                            {task.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !detail.primaryTransaction ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                    <div className="flex items-start gap-3">
                      <Package className="mt-0.5 h-5 w-5 text-indigo-400" />
                      <div>
                        <p className="font-semibold text-white">
                          Activity will appear here soon
                        </p>
                        <p className="mt-1">
                          As payment and fulfillment events arrive from the backend,
                          they will show up here for quick visibility.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <OrderNextActionCard
              viewerRole={detail.viewerRole}
              onViewerRoleChange={detail.setViewerRole}
              nextAction={detail.nextAction}
              deliveryUrlInput={detail.deliveryUrlInput}
              onDeliveryUrlChange={detail.setDeliveryUrlInput}
              deliveryTextInput={detail.deliveryTextInput}
              onDeliveryTextChange={detail.setDeliveryTextInput}
              onMarkInProgress={detail.markInProgress}
              onMarkDelivered={detail.markDelivered}
              onConfirmCompletion={detail.confirmCompletion}
              activeTransaction={detail.activeContractAction}
              actionNotice={detail.actionNotice}
              actionWarning={detail.actionWarning}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
