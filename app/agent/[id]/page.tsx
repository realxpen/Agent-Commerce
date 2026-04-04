"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import {
  BarChart3,
  Bot,
  Coins,
  Globe,
  ShoppingBag,
  Wallet,
} from "lucide-react"
import { AgentServiceCard } from "@/components/agents/AgentServiceCard"
import { WalletActionButton } from "@/components/guards"
import { HeaderBackLink } from "@/components/layout/HeaderBackLink"
import { WalletSessionControls } from "@/components/layout/WalletSessionControls"
import { SessionApprovalCard } from "@/components/session"
import { SkeletonBlock, StatusNoticeCard } from "@/components/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton"
import { useAgentProfile } from "@/hooks/agents"
import { getApiErrorMessage, getApiErrorTitle } from "@/lib/api"
import { buildCheckoutHref } from "@/lib/orders/checkout"

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Coins
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
          <Icon className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function AgentProfilePage() {
  const params = useParams<{ id: string }>()
  const agentId = params?.id ?? ""
  const profile = useAgentProfile(agentId)

  if (profile.isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <main className="container mx-auto px-6 pt-32">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <SkeletonBlock className="glass-card h-[520px] rounded-3xl lg:col-span-2" />
            <SkeletonBlock className="glass-card h-[420px] rounded-3xl" />
          </div>
        </main>
      </div>
    )
  }

  if (profile.isError || !profile.agent) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <main className="container mx-auto px-6 pt-32">
          <div className="space-y-4">
            <StatusNoticeCard
              tone="danger"
              title={getApiErrorTitle(profile.error) || "Agent unavailable"}
              description={getApiErrorMessage(profile.error)}
              actionLabel="Retry"
              onAction={() => profile.refetch().then(() => undefined)}
            />
            <Link href="/marketplace">
              <Button>Back to Marketplace</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const { agent } = profile
  const stats = profile.dashboardStats
  const revenueValue = stats ? `${stats.totals.netRevenue} ${stats.treasury.denom ?? ""}`.trim() : "Stats syncing"
  const ordersValue = stats
    ? String(stats.totals.totalOrders)
    : String(agent.orderCount)
  const servicesValue = String(profile.services.length)

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <HeaderBackLink href="/marketplace" label="Back to Marketplace" />
          <WalletSessionControls surface="agent_profile" showRemaining />
        </div>
      </header>

      <main className="container mx-auto px-6 pt-32">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <div className="flex flex-col gap-8 md:flex-row md:items-start">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl border border-indigo-500/20 bg-indigo-500/10 shadow-[0_0_40px_rgba(79,70,229,0.15)]">
                <Bot className="h-16 w-16 text-indigo-500" />
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-display font-bold tracking-tight md:text-5xl">
                    {agent.name}
                  </h1>
                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    {agent.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-white/60"
                  >
                    {agent.category}
                  </Badge>
                </div>
                <p className="text-xl font-medium text-indigo-400">
                  {agent.initUsername ? `@${agent.initUsername}` : agent.slug}
                </p>
                <p className="max-w-3xl text-lg leading-relaxed text-white/60">
                  {agent.description}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Net Revenue" value={revenueValue} icon={Coins} />
              <StatCard label="Orders" value={ordersValue} icon={ShoppingBag} />
              <StatCard label="Services" value={servicesValue} icon={BarChart3} />
            </div>

            {!profile.statsUnavailable && stats ? (
              <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold">
                      Backend stats
                    </h2>
                    <p className="mt-1 text-white/45">
                      Dashboard totals from the backend analytics layer.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-white/10 bg-white/5">
                    {stats.range}
                  </Badge>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                      Gross Revenue
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {stats.totals.grossRevenue}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                      Available Balance
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {stats.treasury.availableBalance}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                      Pending Revenue
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {stats.totals.pendingRevenue}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">
                <h2 className="text-2xl font-display font-bold">
                  Backend stats
                </h2>
                <p className="mt-2 text-white/45">
                  Revenue and treasury analytics are not available in this
                  environment because the backend dashboard endpoint is missing.
                </p>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold">
                    Services
                  </h2>
                  <p className="mt-1 text-white/45">
                    Verified working preset services currently visible for this agent.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-white/60"
                >
                  {profile.services.length} listed
                </Badge>
              </div>

              {profile.servicesQuery.isLoading ? (
                <div className="grid gap-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <SkeletonBlock
                      key={index}
                      className="h-[220px]"
                    />
                  ))}
                </div>
              ) : null}

              {!profile.servicesQuery.isLoading && !profile.servicesUnavailable && profile.services.length > 0 ? (
                <div className="grid gap-4">
                  {profile.services.map((service) => (
                    <AgentServiceCard
                      key={service.id}
                      service={service}
                      cta={{
                        ...profile.orderCta,
                        href: profile.orderCta.disabled
                          ? null
                          : buildCheckoutHref({
                              agent,
                              service,
                            }),
                      }}
                    />
                  ))}
                </div>
              ) : null}

              {!profile.servicesQuery.isLoading &&
              !profile.servicesUnavailable &&
              profile.services.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-white/55">
                  No services are published for this agent yet.
                </div>
              ) : null}

              {profile.servicesUnavailable ? (
                <StatusNoticeCard
                  tone="warning"
                  title="Service catalog unavailable"
                  description="The backend service-listing endpoint is not available yet, so individual services cannot be shown on this profile for now."
                />
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-32">
              <Card className="glass-card overflow-hidden border-indigo-500/20 shadow-[0_0_50px_rgba(79,70,229,0.1)]">
                <div className="bg-indigo-600 px-6 py-2 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                    Wallet-Aware Ordering
                  </p>
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl font-display font-bold">
                    {profile.primaryService?.title ?? "Ordering"}
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    {profile.primaryService?.description ??
                      "Connect your wallet and choose a live service to begin."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                      Primary price
                    </p>
                    <p className="mt-2 text-4xl font-display font-bold text-emerald-400">
                      {profile.primaryService
                        ? profile.primaryService.pricing.currency
                          ? `${profile.primaryService.pricing.amount} ${profile.primaryService.pricing.currency}`
                          : `${profile.primaryService.pricing.amount} ${profile.primaryService.pricing.denom}`
                        : "Unavailable"}
                    </p>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-3">
                      <Wallet className="h-5 w-5 text-indigo-400" />
                      <div>
                        <p className="font-semibold text-white">
                          {profile.orderCta.label}
                        </p>
                        <p className="text-sm text-white/45">
                          {profile.orderCta.helperText}
                        </p>
                      </div>
                    </div>

                    {profile.orderCta.disabled || !profile.orderCta.href ? (
                      profile.primaryService &&
                      (!profile.wallet.isConnected ||
                        !profile.wallet.isOnExpectedAppchain) ? (
                        <WalletActionButton
                          className="w-full"
                          onAuthorizedAction={() => void 0}
                          connectLabel="Connect Wallet to Order"
                        >
                          {profile.orderCta.label}
                        </WalletActionButton>
                      ) : (
                        <Button className="w-full" disabled>
                          {profile.orderCta.label}
                        </Button>
                      )
                    ) : (
                      <Link href={profile.orderCta.href} className="block">
                        <Button className="w-full">Hire Agent</Button>
                      </Link>
                    )}

                    {!profile.wallet.isConnected ? (
                      <div className="pt-2">
                        <ConnectWalletButton />
                      </div>
                    ) : null}
                  </div>

                  <SessionApprovalCard compact surface="agent_profile" />

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-sm text-white/55">
                    <div className="flex items-center gap-2 text-white/80">
                      <Globe className="h-4 w-4 text-emerald-400" />
                      <span>{profile.wallet.expectedNetworkLabel}</span>
                    </div>
                    <p className="mt-2">
                      Payments and order settlement are handled through the
                      appchain, while the backend keeps the consumer workflow in
                      sync.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
