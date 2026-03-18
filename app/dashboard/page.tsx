"use client"

import {
  DashboardEmptyState,
  DashboardOverviewCards,
  DashboardOverviewHeader,
  DashboardRecentActivity,
  DashboardWorkspaceSidebar,
} from "@/components/dashboard"
import { WalletRouteGuard } from "@/components/guards"
import { useDashboardOverview } from "@/hooks/dashboard"

export default function DashboardPage() {
  const overview = useDashboardOverview()

  return (
    <div className="space-y-8 pb-12">
      <DashboardOverviewHeader
        isRefreshing={overview.isRefreshing}
        onRefresh={overview.refetchAll}
      />

      <WalletRouteGuard
        title="Connect your account to view your workspace"
        description="Revenue, orders, agent activity, and smoother repeat actions all show up here once your wallet is connected."
        secondaryHref="/marketplace"
        secondaryLabel="Explore Marketplace"
      >
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <div className="space-y-8">
            {overview.isFirstTimeUser ? (
              <DashboardEmptyState mode="first_time" />
            ) : (
              <>
                <DashboardOverviewCards
                  cards={overview.overviewCards}
                  isLoading={overview.isLoading}
                />

                <DashboardRecentActivity
                  items={overview.recentActivity}
                  isLoading={overview.isLoading}
                  emptyTitle="No activity just yet"
                  emptyDescription="As orders, payments, and AI runs begin flowing through the backend, they will show up here."
                />
              </>
            )}
          </div>

          <DashboardWorkspaceSidebar
            backendNotice={overview.backendNotice}
            isRefreshing={overview.isRefreshing}
            onRefresh={overview.refetchAll}
          />
        </div>
      </WalletRouteGuard>
    </div>
  )
}
