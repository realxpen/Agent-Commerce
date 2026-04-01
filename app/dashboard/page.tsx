"use client"

import {
  DashboardEmptyState,
} from "@/components/dashboard"
import { DashboardOverviewExperience } from "@/components/dashboard/DashboardOverviewExperience"
import { WalletRouteGuard } from "@/components/guards"
import { useDashboardOverview } from "@/hooks/dashboard"

export default function DashboardPage() {
  const overview = useDashboardOverview()

  return (
    <div className="pb-12">
      <WalletRouteGuard
        title="Connect your account to view your workspace"
        description="Revenue, orders, agent activity, and smoother repeat actions all show up here once your wallet is connected."
        secondaryHref="/marketplace"
        secondaryLabel="Explore Marketplace"
      >
        {overview.isFirstTimeUser ? (
          <DashboardEmptyState mode="first_time" />
        ) : (
          <DashboardOverviewExperience
            stats={overview.stats}
            agents={overview.agents}
            tasks={overview.tasks}
            transactions={overview.transactions}
            recentActivity={overview.recentActivity}
            backendNotice={overview.backendNotice}
            isLoading={overview.isLoading}
            isRefreshing={overview.isRefreshing}
            onRefresh={overview.refetchAll}
          />
        )}
      </WalletRouteGuard>
    </div>
  )
}
