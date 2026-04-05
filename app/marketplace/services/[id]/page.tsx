"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  ListChecks,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
} from "lucide-react"
import { HeaderBackLink } from "@/components/layout/HeaderBackLink"
import { BrandMark } from "@/components/layout/BrandMark"
import { MarketplaceListingVisual } from "@/components/marketplace/MarketplaceListingVisual"
import { WalletSessionControls } from "@/components/layout/WalletSessionControls"
import { SkeletonBlock, StatusNoticeCard } from "@/components/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAgent, useService } from "@/hooks/api"
import { getApiErrorMessage, getApiErrorTitle } from "@/lib/api"
import {
  buildMarketplaceServiceHref,
  getMarketplaceDiscoveryCategory,
  getMarketplaceServiceSocialHeadline,
  getMarketplaceServiceSocialNote,
  getMarketplaceServiceVisual,
} from "@/lib/marketplace/service-presentation"
import { buildCheckoutHref } from "@/lib/orders/checkout"
import {
  getServiceDeliverableDefinitionFromMetadata,
} from "@/lib/services/deliverable-profile"
import {
  getServiceExecutionMode,
  getServiceExecutionModeDefinition,
} from "@/lib/services/execution-mode"
import { isWorkingServicePresetTitle } from "@/lib/services/presets"

function getPriceLabel(price: { amount: string; currency: string | null; denom: string }) {
  return price.currency ? `${price.amount} ${price.currency}` : `${price.amount} ${price.denom}`
}

export default function MarketplaceServiceDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const serviceId = params?.id ?? ""
  const serviceQuery = useService(serviceId)
  const service = serviceQuery.data?.data ?? null
  const agentQuery = useAgent(service?.agentId, {
    enabled: Boolean(service?.agentId),
  })
  const agent = agentQuery.data?.data ?? null

  if (serviceQuery.isLoading) {
    return (
      <div className="min-h-screen bg-black pb-24 text-white">
        <main className="container mx-auto px-4 pt-28 sm:px-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
            <SkeletonBlock className="h-[560px] rounded-[32px]" />
            <SkeletonBlock className="h-[420px] rounded-[32px]" />
          </div>
        </main>
      </div>
    )
  }

  if (serviceQuery.isError || !service) {
    return (
      <div className="min-h-screen bg-black pb-24 text-white">
        <main className="container mx-auto px-4 pt-28 sm:px-6">
          <StatusNoticeCard
            tone="danger"
            title={getApiErrorTitle(serviceQuery.error) || "Listing unavailable"}
            description={getApiErrorMessage(serviceQuery.error)}
            actionLabel="Back to Marketplace"
            onAction={() => {
              router.push("/marketplace")
            }}
          />
        </main>
      </div>
    )
  }

  if (!isWorkingServicePresetTitle(service.title)) {
    return (
      <div className="min-h-screen bg-black pb-24 text-white">
        <main className="container mx-auto px-4 pt-28 sm:px-6">
          <StatusNoticeCard
            tone="warning"
            title="Listing retired"
            description="This older service is no longer part of the active preset catalog. The marketplace now only shows the verified working preset services."
            actionLabel="Back to Marketplace"
            onAction={() => {
              router.push("/marketplace")
            }}
          />
        </main>
      </div>
    )
  }

  const discoveryCategory = getMarketplaceDiscoveryCategory(service, agent ?? service.agent ?? null)
  const visual = getMarketplaceServiceVisual(service, { discoveryCategory })
  const socialHeadline = getMarketplaceServiceSocialHeadline(service, discoveryCategory, agent)
  const socialNote = getMarketplaceServiceSocialNote(service, discoveryCategory)
  const deliverableDefinition = getServiceDeliverableDefinitionFromMetadata(service.metadata)
  const executionModeDefinition = getServiceExecutionModeDefinition(
    getServiceExecutionMode(service.metadata),
  )

  const checkoutHref =
    agent && service
      ? buildCheckoutHref({
          agent,
          service,
        })
      : null

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <HeaderBackLink href="/marketplace" label="Back to Marketplace" />
            <BrandMark className="hidden sm:flex" />
          </div>
          <WalletSessionControls surface="agent_profile" showSessionStatus={false} />
        </div>
      </header>

      <main className="container mx-auto px-4 pt-28 sm:px-6">
        <div className="grid gap-8 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <MarketplaceListingVisual
              imageUrl={visual.imageUrl}
              imageAlt={visual.imageAlt}
              eyebrow={visual.promoLabel}
              title={service.title}
              description={visual.promoNote}
              badges={[
                discoveryCategory,
                deliverableDefinition.label,
                executionModeDefinition.label,
                getPriceLabel(service.pricing),
              ]}
              className="aspect-[16/10] min-h-[420px]"
            />

            <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                  {socialHeadline}
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/60">
                  {deliverableDefinition.automationLabel}
                </Badge>
              </div>
              <p className="mt-4 text-lg leading-8 text-white/80">
                {service.description || "This live marketplace service is ready to accept a brief right now."}
              </p>
              <p className="mt-4 text-sm leading-7 text-white/58">{socialNote}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-white">Best used for</h2>
                    <p className="text-sm text-white/45">Marketplace-ready deliverable placements for this listing.</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {visual.placements.map((placement) => (
                    <div key={placement.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="font-semibold text-white">{placement.label}</p>
                      <p className="mt-2 text-sm leading-6 text-white/55">{placement.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-white">Buyer should provide</h2>
                    <p className="text-sm text-white/45">The inputs that make this service produce a stronger delivery.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {visual.buyerChecklist.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <p className="text-sm leading-6 text-white/70">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-28">
            <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                Starting at
              </p>
              <p className="mt-2 text-4xl font-display font-bold text-emerald-400">
                {getPriceLabel(service.pricing)}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Delivery</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/78">
                    <Clock3 className="h-4 w-4 text-indigo-300" />
                    {service.estimatedDeliveryMinutes ? `${service.estimatedDeliveryMinutes} min` : "Flexible"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Format</p>
                  <p className="mt-2 text-sm text-white/78">{deliverableDefinition.label}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {checkoutHref ? (
                  <Button asChild className="bg-indigo-600 text-white hover:bg-indigo-500">
                    <Link href={checkoutHref}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Order this service
                    </Link>
                  </Button>
                ) : (
                  <Button disabled>Order this service</Button>
                )}
                <Button asChild variant="outline" className="border-white/10 bg-white/5">
                  <Link href={buildMarketplaceServiceHref(service.id)}>Refresh listing</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                    Operator
                  </p>
                  <h2 className="mt-2 text-xl font-display font-bold text-white">
                    {agent?.name ?? service.agent?.name ?? "Agent storefront"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    {agent?.description || "This agent is live on the marketplace and can take new briefs through the checkout flow."}
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <Badge variant="outline" className="w-fit border-white/10 bg-white/5 text-white/60">
                  {agent?.category ?? service.agent?.category ?? "Marketplace agent"}
                </Badge>
                {agent ? (
                  <Button asChild variant="outline" className="border-white/10 bg-white/5">
                    <Link href={`/agent/${agent.id}`}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View agent profile
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
