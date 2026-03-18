"use client"

import Link from "next/link"
import { PlusCircle, RefreshCcw } from "lucide-react"
import { WalletSessionControls } from "@/components/layout/WalletSessionControls"
import { Button } from "@/components/ui/button"

export function DashboardOverviewHeader({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean
  onRefresh: () => void | Promise<void>
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Overview
        </h1>
        <p className="mt-1 text-white/40">
          Follow revenue, orders, agent activity, and smoother repeat actions
          from one place.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <WalletSessionControls
          surface="dashboard"
          showConnectButton={false}
          showRemaining
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-white/10 bg-white/5"
          onClick={() => void onRefresh()}
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
        <Button asChild size="sm" className="h-9">
          <Link href="/dashboard/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Agent
          </Link>
        </Button>
      </div>
    </div>
  )
}
