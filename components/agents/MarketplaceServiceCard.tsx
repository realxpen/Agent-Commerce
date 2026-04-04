"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  Bot,
  Clock3,
  ExternalLink,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
  Star,
  TrendingUp,
  WalletCards,
} from "lucide-react"
import { MarketplaceListingVisual } from "@/components/marketplace/MarketplaceListingVisual"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { MarketplaceCatalogService } from "@/hooks/marketplace/useMarketplaceCatalog"
import { buildMarketplaceServiceHref } from "@/lib/marketplace/service-presentation"
import { buildCheckoutHref } from "@/lib/orders/checkout"

function getPriceLabel(service: MarketplaceCatalogService) {
  return service.pricing.currency
    ? `${service.pricing.amount} ${service.pricing.currency}`
    : `${service.pricing.amount} ${service.pricing.denom}`
}

export function MarketplaceServiceCard({
  service,
  index,
  accentLabel,
}: {
  service: MarketplaceCatalogService
  index: number
  accentLabel?: string | null
}) {
  const agent = service.marketAgent
  const detailHref = buildMarketplaceServiceHref(service.id)
  const checkoutHref = agent
    ? buildCheckoutHref({
        agent: {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          treasuryAddress: agent.treasuryAddress,
        },
        service,
      })
    : null

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group h-full"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-[0_28px_100px_rgba(79,70,229,0.15)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/45 to-transparent" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/25 bg-indigo-500/12 text-indigo-300">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">
                  {agent?.name ?? "Live service"}
                </p>
                {agent?.status === "ACTIVE" ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                ) : null}
              </div>
              <p className="truncate text-xs text-white/40">
                {agent?.initUsername ? `@${agent.initUsername}` : agent?.slug ?? service.slug}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {accentLabel ? (
              <Badge className="border-amber-500/20 bg-amber-500/10 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                {accentLabel}
              </Badge>
            ) : null}
            <Badge
              variant="outline"
              className="border-white/10 bg-white/6 text-[10px] uppercase tracking-[0.18em] text-white/55"
            >
              {service.discoveryCategory}
            </Badge>
          </div>
        </div>

        <MarketplaceListingVisual
          imageUrl={service.visual.imageUrl}
          imageAlt={service.visual.imageAlt}
          eyebrow={service.visual.promoLabel}
          title={service.visual.promoHeadline}
          description={service.visual.promoNote}
          badges={[
            getPriceLabel(service),
            service.executionModeLabel,
            service.deliverableLabel,
          ]}
          className="mt-6 aspect-[4/3]"
          compact
        />

        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-indigo-500/20 bg-indigo-500/10 text-[10px] uppercase tracking-[0.18em] text-indigo-200"
            >
              {service.deliverableLabel}
            </Badge>
            <Badge
              variant="outline"
              className="border-white/10 bg-white/6 text-[10px] uppercase tracking-[0.18em] text-white/55"
            >
              {service.deliverableAutomationLabel}
            </Badge>
          </div>

          <div>
            <h3 className="text-2xl font-display font-bold tracking-tight text-white transition-colors group-hover:text-indigo-100">
              {service.title}
            </h3>
            <p className="mt-3 line-clamp-3 text-sm leading-7 text-white/60">
              {service.description || "This live service is ready to take a new customer brief right now."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {service.visual.placements.slice(0, 2).map((placement) => (
            <div
              key={placement.label}
              className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                  <ListChecks className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{placement.label}</p>
                  <p className="mt-1 text-sm leading-6 text-white/55">{placement.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              Price
            </p>
            <p className="mt-2 text-lg font-semibold text-emerald-300">
              {getPriceLabel(service)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              Delivery
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/78">
              <Clock3 className="h-4 w-4 text-indigo-300" />
              {service.estimatedDeliveryMinutes
                ? `${service.estimatedDeliveryMinutes} min`
                : "Flexible"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <div className="flex items-center gap-1.5 text-amber-300">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="text-sm font-semibold">{service.activitySignal.toFixed(1)}</span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/32">
              Live signal
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <div className="flex items-center gap-1.5 text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold">{agent?.orderCount ?? 0}</span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/32">
              Indexed orders
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <div className="flex items-center gap-1.5 text-indigo-200">
              <WalletCards className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold">{agent?.serviceCount ?? 1}</span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/32">
              Live services
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/8 bg-black/25 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{service.socialHeadline}</p>
              <p className="mt-2 text-sm leading-7 text-white/58">
                {service.socialNote}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-300" />
            <span className="truncate">{agent?.category ?? "Agent storefront"}</span>
          </div>
          <div className="flex items-center gap-2 text-white/42">
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
              Feed-ready
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 pt-1">
          {checkoutHref ? (
            <Button asChild className="flex-1 bg-indigo-600 text-white hover:bg-indigo-500">
              <Link href={checkoutHref}>Hire Service</Link>
            </Button>
          ) : (
            <Button disabled className="flex-1">
              Hire Service
            </Button>
          )}

          <Button asChild variant="outline" className="border-white/10 bg-white/5">
            <Link href={detailHref}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Details
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
