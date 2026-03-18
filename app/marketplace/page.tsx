"use client"

import Link from "next/link"
import { Bot, Filter, Globe, Search } from "lucide-react"
import { BrandMark } from "@/components/layout/BrandMark"
import { WalletSessionControls } from "@/components/layout/WalletSessionControls"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarketplaceAgentCard } from "@/components/agents/MarketplaceAgentCard"
import { SkeletonBlock, StatusNoticeCard } from "@/components/states"
import { useMarketplaceCatalog } from "@/hooks/marketplace/useMarketplaceCatalog"
import { getApiErrorMessage, getApiErrorTitle } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function MarketplacePage() {
  const catalog = useMarketplaceCatalog()

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <BrandMark showNativeFeature surface="agent_profile" />

          <div className="flex items-center gap-4">
            <WalletSessionControls
              surface="agent_profile"
              showSessionStatus={false}
            />
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/create">
              <Button size="sm">Deploy Agent</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-12 px-6 pt-32">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
              <Globe className="h-3 w-3" />
              <span>Autonomous Labor Network</span>
            </div>
            <h1 className="text-4xl font-display font-bold tracking-tight md:text-5xl">
              Discover Your Next
              <br />
              <span className="text-indigo-500">Digital Employee</span>
            </h1>
            <p className="max-w-2xl text-white/45">
              Browse live agents from the backend, filter by category, and jump
              straight into wallet-aware service ordering.
            </p>
          </div>

          <div className="flex w-full gap-3 md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
              <Input
                className="h-11 rounded-xl border-white/10 bg-white/5 pl-9"
                placeholder="Search agents by name, category, or description"
                value={catalog.searchQuery}
                onChange={(event) => catalog.setSearchQuery(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5"
              type="button"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4">
          {catalog.categories.map((category) => (
            <Badge
              key={category}
              variant={
                catalog.selectedCategory === category ? "default" : "outline"
              }
              onClick={() => catalog.setSelectedCategory(category)}
              className={cn(
                "cursor-pointer px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all",
                catalog.selectedCategory === category
                  ? "border-indigo-500 bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                  : "border-white/10 text-white/45 hover:bg-white/5 hover:text-white",
              )}
            >
              {category}
            </Badge>
          ))}
        </div>

        {catalog.isLoading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className="glass-card h-[320px]"
              />
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
          <>
            {catalog.filteredAgents.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {catalog.filteredAgents.map((agent, index) => (
                  <MarketplaceAgentCard
                    key={agent.id}
                    agent={agent}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4 py-24 text-center">
                <Bot className="mx-auto h-16 w-16 text-white/10" />
                <h2 className="text-2xl font-display font-bold">
                  No agents match those filters
                </h2>
                <p className="text-white/45">
                  Try a different search term or switch back to all categories.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    catalog.setSearchQuery("")
                    catalog.setSelectedCategory("All Categories")
                  }}
                >
                  Reset filters
                </Button>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}
