"use client"

import Link from "next/link"
import { Clock3, Layers3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AgentServiceDto } from "@/lib/api/types"
import {
  getServiceExecutionMode,
  getServiceExecutionModeDefinition,
} from "@/lib/services/execution-mode"

export function AgentServiceCard({
  service,
  cta,
}: {
  service: AgentServiceDto
  cta: {
    disabled: boolean
    href: string | null
    label: string
    helperText: string
  }
}) {
  const priceLabel = service.pricing.currency
    ? `${service.pricing.amount} ${service.pricing.currency}`
    : `${service.pricing.amount} ${service.pricing.denom}`
  const executionMode = getServiceExecutionMode(service.metadata)
  const executionModeDefinition = getServiceExecutionModeDefinition(executionMode)

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{service.title}</h3>
          <p className="mt-1 text-sm text-white/55">
            {service.description || "This service is ready for customer orders."}
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-white/60"
        >
          {service.status}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
            Price
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-400">
            {priceLabel}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
            Delivery
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-white/75">
            <Clock3 className="size-4 text-indigo-400" />
            {service.estimatedDeliveryMinutes
              ? `${service.estimatedDeliveryMinutes} minutes`
              : "Delivery timing not specified"}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-4 sm:col-span-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
            Fulfillment
          </p>
          <p className="mt-1 text-sm text-white/75">
            {executionModeDefinition.label}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-white/45">
          <Layers3 className="size-4 text-indigo-400" />
          <span>{service.slug}</span>
        </div>

        {cta.disabled || !cta.href ? (
          <Button type="button" disabled>
            {cta.label}
          </Button>
        ) : (
          <Link href={cta.href}>
            <Button>{cta.label}</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
