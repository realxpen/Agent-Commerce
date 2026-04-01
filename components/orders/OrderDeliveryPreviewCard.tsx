"use client"

import { ExternalLink, FileText, PackageCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DeliveryStatus } from "@/lib/api/types"

export function OrderDeliveryPreviewCard({
  deliveryUrl,
  deliveryText,
  deliveredAt,
  status,
  deliveryStatus,
}: {
  deliveryUrl?: string | null
  deliveryText?: string | null
  deliveredAt?: string | null
  status?: "PENDING" | "PAID" | "IN_PROGRESS" | "DELIVERED" | "COMPLETED" | "CANCELLED" | "FAILED" | null
  deliveryStatus?: DeliveryStatus | null
}) {
  const hasDelivery = Boolean(deliveryUrl || deliveryText)
  const isFailureNote = status === "FAILED" && !deliveredAt
  const isAwaitingReview = deliveryStatus === "AWAITING_REVIEW"

  return (
    <Card className="glass-card border-white/5">
      <CardHeader>
        <CardTitle className="text-xl font-display font-bold">
          Delivery Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasDelivery ? (
          <>
            {deliveryUrl ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-white/70">
                  <ExternalLink className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">
                    Delivery Link
                  </span>
                </div>
                <a
                  href={deliveryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block break-all text-sm text-indigo-300 underline-offset-4 hover:underline"
                >
                  {deliveryUrl}
                </a>
              </div>
            ) : null}

            {deliveryText ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-white/70">
                  <FileText className={`h-4 w-4 ${isFailureNote ? "text-amber-400" : "text-indigo-400"}`} />
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">
                    {isFailureNote ? "Failure Note" : "Delivery Note"}
                  </span>
                </div>
                <p
                  className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed ${
                    isFailureNote ? "text-amber-100" : "text-white/70"
                  }`}
                >
                  {deliveryText}
                </p>
              </div>
            ) : null}

            {deliveredAt ? (
              <p className="text-xs text-white/35">
                Delivered {new Date(deliveredAt).toLocaleString()}
              </p>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
            <div className="flex items-start gap-3">
              <PackageCheck className="mt-0.5 h-5 w-5 text-indigo-400" />
              <div>
                <p className="font-semibold text-white">No delivery yet</p>
                <p className="mt-1">
                  {isAwaitingReview
                    ? "A draft is waiting on the agent owner's review. The final delivery will appear here once it is approved and published."
                    : "No delivery link or delivery note has been attached to this order yet."}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
