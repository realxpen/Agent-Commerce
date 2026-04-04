"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Clock3,
  Compass,
  Flame,
  Image as ImageIcon,
  LayoutList,
  MessageCircle,
  MoreHorizontal,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Video,
} from "lucide-react"
import { MarketplaceServiceCard } from "@/components/agents/MarketplaceServiceCard"
import { BrandMark } from "@/components/layout/BrandMark"
import { MarketplaceListingVisual } from "@/components/marketplace/MarketplaceListingVisual"
import { WalletSessionControls } from "@/components/layout/WalletSessionControls"
import { SkeletonBlock, StatusNoticeCard } from "@/components/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MarketplaceCatalogService } from "@/hooks/marketplace/useMarketplaceCatalog"
import { useMarketplaceCatalog } from "@/hooks/marketplace/useMarketplaceCatalog"
import { getApiErrorMessage, getApiErrorTitle } from "@/lib/api"
import {
  allMarketplaceCategoriesLabel,
  buildMarketplaceServiceHref,
} from "@/lib/marketplace/service-presentation"
import { buildCheckoutHref } from "@/lib/orders/checkout"
import { cn } from "@/lib/utils"

type LaneVisual = {
  icon: typeof Sparkles
  gradient: string
}

function getLaneVisual(label: string): LaneVisual {
  switch (label) {
    case "Ads & Flyers":
      return {
        icon: ImageIcon,
        gradient: "from-orange-500/25 via-pink-500/18 to-indigo-500/10",
      }
    case "Research & Strategy":
      return {
        icon: Compass,
        gradient: "from-cyan-500/22 via-sky-500/14 to-indigo-500/10",
      }
    case "Docs & Copy":
      return {
        icon: Sparkles,
        gradient: "from-blue-500/22 via-indigo-500/14 to-violet-500/10",
      }
    case "Code & Contracts":
      return {
        icon: Sparkles,
        gradient: "from-violet-500/22 via-indigo-500/16 to-fuchsia-500/10",
      }
    case "Data & Sheets":
      return {
        icon: BarChart3,
        gradient: "from-emerald-500/22 via-teal-500/14 to-cyan-500/10",
      }
    case "Web & Frontend":
      return {
        icon: Compass,
        gradient: "from-fuchsia-500/18 via-indigo-500/16 to-blue-500/10",
      }
    case "Video & Audio":
      return {
        icon: Video,
        gradient: "from-rose-500/22 via-amber-500/15 to-orange-500/10",
      }
    default:
      return {
        icon: Sparkles,
        gradient: "from-indigo-500/24 via-violet-500/15 to-fuchsia-500/10",
      }
  }
}

function getAgentInitials(value: string) {
  const parts = value.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function formatListedTime(value: string) {
  const date = new Date(value)
  return `Listed ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`
}

function getPriceLabel(service: MarketplaceCatalogService) {
  return service.pricing.currency
    ? `${service.pricing.amount} ${service.pricing.currency}`
    : `${service.pricing.amount} ${service.pricing.denom}`
}

function LaneStoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  const visual = getLaneVisual(label)
  const Icon = visual.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-w-[74px] flex-col items-center gap-2",
        active ? "text-white" : "text-white/60 hover:text-white",
      )}
    >
      <div className="rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[1.5px]">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full border border-black bg-gradient-to-br text-white transition group-hover:scale-[1.03]",
            visual.gradient,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-bold">{label}</p>
        <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">
          {count} live
        </p>
      </div>
    </button>
  )
}

function MarketplaceFeedCard({
  service,
  index,
}: {
  service: MarketplaceCatalogService
  index: number
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
    <div
      className="rounded-3xl border border-white/5 bg-white/[0.02] p-5 transition-colors hover:border-white/10"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-sm font-bold text-white shadow-lg">
            {getAgentInitials(agent?.name ?? service.title)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white">{agent?.name ?? service.title}</span>
              {agent ? <ShieldCheck className="h-4 w-4 text-indigo-400" /> : null}
              <span className="text-sm text-white/35">| {formatListedTime(service.createdAt)}</span>
            </div>
            <span className="text-sm text-white/40">
              {agent?.initUsername ? `@${agent.initUsername}` : agent?.slug ?? service.slug}
            </span>
          </div>
        </div>
        <button className="rounded-full p-2 text-white/35 transition hover:bg-white/10 hover:text-white">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <p className="text-[15px] leading-8 text-white/82">
          {service.socialHeadline}. {service.description || service.socialNote}
        </p>

        <MarketplaceListingVisual
          imageUrl={service.visual.imageUrl}
          imageAlt={service.visual.imageAlt}
          eyebrow={service.visual.promoLabel}
          title={service.title}
          description={service.visual.promoNote}
          badges={[
            service.discoveryCategory,
            service.deliverableLabel,
            service.executionModeLabel,
          ]}
          className="aspect-[16/10]"
          compact
        />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className="border-indigo-500/30 bg-indigo-500/10 text-[10px] uppercase tracking-widest text-indigo-300"
              >
                {service.deliverableLabel}
              </Badge>
              <div className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                <Star className="h-3 w-3 fill-current" />
                <span className="font-bold">{service.activitySignal.toFixed(1)}</span>
                <span className="text-amber-300/60">live signal</span>
              </div>
            </div>
            <h4 className="text-lg font-bold text-white">{service.title}</h4>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/52">
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                {service.estimatedDeliveryMinutes
                  ? `${service.estimatedDeliveryMinutes} min delivery`
                  : "Flexible delivery"}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {service.executionModeLabel}
              </span>
            </div>
          </div>

          <div className="w-full border-t border-white/10 pt-4 sm:w-auto sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
              Starting at
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {getPriceLabel(service)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {checkoutHref ? (
                <Button
                  asChild
                  size="sm"
                  className="w-full rounded-xl bg-white font-bold text-black hover:bg-gray-200 sm:w-auto"
                >
                  <Link href={checkoutHref}>Order Now</Link>
                </Button>
              ) : (
                <Button size="sm" disabled className="w-full rounded-xl sm:w-auto">
                  Order Now
                </Button>
              )}
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full rounded-xl border-white/10 bg-white/5 sm:w-auto"
              >
                <Link href={detailHref}>View details</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-white/5 px-2 pt-4 text-white/40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-5 w-5 text-orange-300" />
            <span className="font-medium">{agent?.orderCount ?? 0}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle className="h-5 w-5 text-blue-300" />
            <span className="font-medium">{agent?.serviceCount ?? 1}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Share2 className="h-5 w-5 text-emerald-300" />
            <span className="font-medium">{service.activitySignal.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="rounded-full text-white/65 hover:bg-white/10 hover:text-white">
            <Link href={detailHref}>Details</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full text-white/65 hover:bg-white/10 hover:text-white">
            <Link href={`/agent/${agent?.id ?? service.agentId}`}>Agent</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function MarketplaceBackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 900)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        })
      }}
      className={cn(
        "fixed bottom-6 right-4 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 hover:border-indigo-400/40 hover:bg-black sm:bottom-8 sm:right-6",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      )}
      aria-label="Back to top"
    >
      <ArrowUp className="h-4 w-4" />
      <span className="hidden sm:inline">Back to top</span>
    </button>
  )
}

export default function MarketplacePage() {
  const catalog = useMarketplaceCatalog()
  const [activeView, setActiveView] = useState<"feed" | "shop">("feed")

  const categoryStories = catalog.categories.filter(
    (category) => category.label !== allMarketplaceCategoriesLabel,
  )

  const feedServices = catalog.filteredServices.slice(0, 8)

  const featuredVisualServices = useMemo(() => {
    const ordered = [
      ...catalog.filteredServices,
      ...catalog.trendingServices,
      ...catalog.recommendedServices,
      ...catalog.freshServices,
    ]

    return Array.from(
      new Map(ordered.map((service) => [service.id, service])).values(),
    ).slice(0, 3)
  }, [
    catalog.filteredServices,
    catalog.freshServices,
    catalog.recommendedServices,
    catalog.trendingServices,
  ])

  const spotlightService = featuredVisualServices[0] ?? null

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <BrandMark showNativeFeature surface="agent_profile" />

          <div className="mx-4 hidden max-w-xl flex-1 md:block lg:mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                className="h-10 rounded-full border-white/10 bg-white/5 pl-11 text-sm placeholder:text-white/30 focus-visible:ring-indigo-500"
                placeholder="Search services, agents, or categories..."
                value={catalog.searchQuery}
                onChange={(event) => catalog.setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <WalletSessionControls surface="agent_profile" showSessionStatus={false} />
            <Link href="/dashboard" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/create">
              <Button size="sm" className="rounded-full bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:bg-indigo-700">
                Create Service
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex gap-8 px-4 pt-24 sm:px-6">
        <aside className="sticky top-24 hidden h-[calc(100vh-6rem)] w-64 shrink-0 overflow-y-auto pb-8 lg:block">
          <div className="space-y-8">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  catalog.setSelectedCategory(allMarketplaceCategoriesLabel)
                  setActiveView("feed")
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all",
                  catalog.selectedCategory === allMarketplaceCategoriesLabel
                    ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <Star className="h-5 w-5" />
                All Services
              </button>

              {categoryStories.map((category) => (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => {
                    catalog.setSelectedCategory(category.label)
                    setActiveView("feed")
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all",
                    catalog.selectedCategory === category.label
                      ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                      : "text-white/60 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <div className="h-2 w-2 rounded-full bg-current opacity-50" />
                  {category.label}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
                Marketplace Snapshot
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Live services</span>
                  <span className="font-bold text-white">{catalog.metrics.totalServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Active agents</span>
                  <span className="font-bold text-white">{catalog.metrics.totalAgents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Indexed orders</span>
                  <span className="font-bold text-white">{catalog.metrics.totalOrders}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="w-full max-w-3xl flex-1 space-y-6 pb-20">
          <div className="block md:hidden">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                className="h-10 rounded-full border-white/10 bg-white/5 pl-11 text-sm placeholder:text-white/30 focus-visible:ring-indigo-500"
                placeholder="Search services, agents, or categories..."
                value={catalog.searchQuery}
                onChange={(event) => catalog.setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {categoryStories.map((category) => (
              <LaneStoryChip
                key={category.label}
                label={category.label}
                count={category.count}
                active={catalog.selectedCategory === category.label}
                onClick={() => {
                  catalog.setSelectedCategory(category.label)
                  setActiveView("feed")
                }}
              />
            ))}
          </div>

          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5 sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr] xl:items-center">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                  <Compass className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl font-display font-bold tracking-tight text-white sm:text-4xl">
                      Browse live AI services like a social storefront.
                    </h1>
                    <p className="mt-2 text-sm leading-7 text-white/55">
                      Discover banner-ready creative, research briefs, technical delivery, and other live services without drilling through agents first.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Services</p>
                      <p className="mt-2 text-xl font-bold text-white">{catalog.metrics.totalServices}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Agents</p>
                      <p className="mt-2 text-xl font-bold text-white">{catalog.metrics.totalAgents}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Orders</p>
                      <p className="mt-2 text-xl font-bold text-white">{catalog.metrics.totalOrders}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">AI-ready</p>
                      <p className="mt-2 text-xl font-bold text-white">{catalog.metrics.aiReadyCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              {spotlightService ? (
                <MarketplaceListingVisual
                  imageUrl={spotlightService.visual.imageUrl}
                  imageAlt={spotlightService.visual.imageAlt}
                  eyebrow={spotlightService.visual.promoLabel}
                  title={spotlightService.visual.promoHeadline}
                  description={spotlightService.visual.promoNote}
                  badges={[
                    spotlightService.discoveryCategory,
                    getPriceLabel(spotlightService),
                    spotlightService.deliverableLabel,
                  ]}
                  className="aspect-[4/3]"
                  compact
                />
              ) : null}
            </div>
          </div>

          {featuredVisualServices.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {featuredVisualServices.slice(0, 2).map((service) => (
                <div
                  key={service.id}
                  className="rounded-3xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <MarketplaceListingVisual
                    imageUrl={service.visual.imageUrl}
                    imageAlt={service.visual.imageAlt}
                    eyebrow={service.visual.promoLabel}
                    title={service.title}
                    description={service.visual.promoNote}
                    badges={service.visual.placements.slice(0, 3).map((placement) => placement.label)}
                    className="aspect-[16/10]"
                    compact
                  />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{service.socialHeadline}</p>
                      <p className="mt-1 text-sm text-white/50">{service.marketAgent?.name ?? "Live service"}</p>
                    </div>
                    <Button asChild variant="outline" className="border-white/10 bg-white/5">
                      <Link href={buildMarketplaceServiceHref(service.id)}>View listing</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
            <button
              type="button"
              onClick={() => catalog.setSelectedCategory(allMarketplaceCategoriesLabel)}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest whitespace-nowrap",
                catalog.selectedCategory === allMarketplaceCategoriesLabel
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-white/10 text-white/40 hover:bg-white/5 hover:text-white",
              )}
            >
              All Services
            </button>
            {categoryStories.map((category) => (
              <button
                key={category.label}
                type="button"
                onClick={() => catalog.setSelectedCategory(category.label)}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest whitespace-nowrap",
                  catalog.selectedCategory === category.label
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-white/10 text-white/40 hover:bg-white/5 hover:text-white",
                )}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex w-fit items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => setActiveView("feed")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
                activeView === "feed" ? "bg-white/10 text-white" : "text-white/40 hover:text-white",
              )}
            >
              <LayoutList className="h-4 w-4" />
              Social Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveView("shop")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all",
                activeView === "shop" ? "bg-white/10 text-white" : "text-white/40 hover:text-white",
              )}
            >
              <Store className="h-4 w-4" />
              Service Shop
            </button>
          </div>

          {catalog.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-[420px] rounded-3xl" />
              ))}
            </div>
          ) : null}

          {catalog.isError ? (
            <StatusNoticeCard
              tone="danger"
              title={getApiErrorTitle(catalog.error) || "Marketplace unavailable"}
              description={getApiErrorMessage(catalog.error)}
              actionLabel="Retry"
              onAction={() => catalog.refetch().then(() => undefined)}
              isActionLoading={catalog.isFetching}
            />
          ) : null}

          {!catalog.isLoading && !catalog.isError ? (
            activeView === "feed" ? (
              <div className="space-y-6">
                {feedServices.length > 0 ? (
                  feedServices.map((service, index) => (
                    <MarketplaceFeedCard key={service.id} service={service} index={index} />
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-white/50">
                    No services match the current filter.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {catalog.filteredServices.length > 0 ? (
                  catalog.filteredServices.map((service, index) => (
                    <MarketplaceServiceCard key={service.id} service={service} index={index} />
                  ))
                ) : (
                  <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-white/50">
                    No services match the current filter.
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>

        <aside className="sticky top-24 hidden h-[calc(100vh-6rem)] w-80 shrink-0 overflow-y-auto pb-8 xl:block">
          <div className="space-y-6">
            {spotlightService ? (
              <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-4">
                <MarketplaceListingVisual
                  imageUrl={spotlightService.visual.imageUrl}
                  imageAlt={spotlightService.visual.imageAlt}
                  eyebrow="Marketplace promo"
                  title={spotlightService.visual.promoHeadline}
                  description={spotlightService.visual.promoNote}
                  badges={spotlightService.visual.placements.slice(0, 3).map((placement) => placement.label)}
                  className="aspect-[4/3]"
                  compact
                />
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-white">{spotlightService.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/60">
                    {spotlightService.description || spotlightService.socialNote}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-emerald-400">
                      {getPriceLabel(spotlightService)}
                    </span>
                    <Button asChild className="bg-white font-semibold text-black hover:bg-gray-200">
                      <Link href={buildMarketplaceServiceHref(spotlightService.id)}>
                        View listing
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Trending Agents
              </h3>
              <div className="space-y-5">
                {catalog.featuredAgents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 font-semibold text-white">
                        {getAgentInitials(agent.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold">{agent.name}</span>
                          <ShieldCheck className="h-3 w-3 text-indigo-400" />
                        </div>
                        <span className="text-xs text-white/40">
                          {agent.initUsername ? `@${agent.initUsername}` : agent.slug}
                        </span>
                      </div>
                    </div>
                    <Link href={`/agent/${agent.id}`}>
                      <Button variant="outline" size="sm" className="h-8 rounded-full border-white/10 bg-transparent text-xs hover:bg-white/10">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                <ShoppingCart className="h-5 w-5 text-emerald-500" />
                Top Services
              </h3>
              <div className="space-y-4">
                {catalog.recommendedServices.slice(0, 4).map((service) => (
                  <Link
                    key={service.id}
                    href={buildMarketplaceServiceHref(service.id)}
                    className="block rounded-2xl border border-white/8 bg-black/20 p-3 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start gap-3">
                      {service.visual.imageUrl ? (
                        <img
                          src={service.visual.imageUrl}
                          alt={service.visual.imageAlt}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/40">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold leading-snug text-white">
                          {service.title}
                        </h4>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-white/40">
                            {service.marketAgent?.initUsername
                              ? `@${service.marketAgent.initUsername}`
                              : service.marketAgent?.slug ?? service.slug}
                          </span>
                          <span className="text-[10px] text-white/20">|</span>
                          <span className="text-xs font-bold text-emerald-400">
                            {getPriceLabel(service)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/48">
                          {service.visual.promoNote}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </main>
      <MarketplaceBackToTopButton />
    </div>
  )
}
