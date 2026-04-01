"use client"

import { CheckCircle2, Circle, Clock3, XCircle } from "lucide-react"
import type { DeliveryStatus, OrderPaymentStatus, OrderStatus } from "@/lib/api/types"
import { cn } from "@/lib/utils"

type TimelineStep = {
  id: string
  label: string
  description: string
  state: "complete" | "current" | "upcoming" | "failed"
}

function buildTimelineSteps(input: {
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  deliveryStatus: DeliveryStatus
}): TimelineStep[] {
  const paymentState: TimelineStep["state"] =
    input.paymentStatus === "PAID"
      ? "complete"
      : input.paymentStatus === "FAILED" || input.paymentStatus === "CANCELLED"
        ? "failed"
        : input.status === "PENDING"
          ? "current"
          : "upcoming"

  const fulfillmentState: TimelineStep["state"] =
    input.deliveryStatus === "AWAITING_REVIEW" ||
    input.status === "DELIVERED" ||
    input.status === "COMPLETED"
      ? "complete"
      : input.status === "IN_PROGRESS" || input.deliveryStatus === "IN_PROGRESS"
      ? "current"
        : input.status === "FAILED" || input.status === "CANCELLED"
          ? "failed"
          : input.status === "PAID"
            ? "upcoming"
            : "upcoming"

  const reviewState: TimelineStep["state"] =
    input.deliveryStatus === "AWAITING_REVIEW" || input.status === "DELIVERED"
      ? "current"
      : input.status === "COMPLETED"
        ? "complete"
        : input.status === "FAILED" || input.status === "CANCELLED"
          ? "failed"
          : "upcoming"

  return [
    {
      id: "created",
      label: "Order Created",
      description: "The service request was created and is now being tracked.",
      state: "complete",
    },
    {
      id: "payment",
      label: "Payment Confirmation",
      description: "Funds move through the appchain and settle into escrow.",
      state: paymentState,
    },
    {
      id: "fulfillment",
      label: "Fulfillment",
      description: "The agent starts and works through the requested service.",
      state: fulfillmentState,
    },
    {
      id: "review",
      label: "Delivery & Review",
      description: "The delivery is shared and the customer reviews the result.",
      state: reviewState,
    },
  ]
}

function TimelineIcon({ state }: { state: TimelineStep["state"] }) {
  if (state === "complete") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
  }

  if (state === "failed") {
    return <XCircle className="h-5 w-5 text-rose-400" />
  }

  if (state === "current") {
    return <Clock3 className="h-5 w-5 text-indigo-400" />
  }

  return <Circle className="h-5 w-5 text-white/20" />
}

export function OrderLifecycleTimeline({
  status,
  paymentStatus,
  deliveryStatus,
}: {
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  deliveryStatus: DeliveryStatus
}) {
  const steps = buildTimelineSteps({
    status,
    paymentStatus,
    deliveryStatus,
  })

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.id} className="relative flex gap-4">
          {index < steps.length - 1 ? (
            <div
              className={cn(
                "absolute left-[9px] top-7 h-[calc(100%-8px)] w-px",
                step.state === "complete"
                  ? "bg-emerald-500/30"
                  : "bg-white/10",
              )}
            />
          ) : null}

          <div className="relative z-10 mt-0.5">
            <TimelineIcon state={step.state} />
          </div>

          <div className="pb-6">
            <p className="text-sm font-semibold text-white">{step.label}</p>
            <p className="mt-1 text-sm text-white/45">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
