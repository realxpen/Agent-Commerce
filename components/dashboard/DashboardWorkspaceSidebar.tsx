"use client"

import Link from "next/link"
import { AlertCircle, CheckCircle2, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SessionApprovalCard } from "@/components/session"
import { WalletAccountCard } from "@/components/wallet/WalletAccountCard"
import type { DashboardBackendNotice } from "@/hooks/dashboard"
import { cn } from "@/lib/utils"

const toneStyles = {
  neutral: "border-white/10 bg-white/[0.03] text-white/70",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-100",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-100",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
} as const

export function DashboardWorkspaceSidebar({
  backendNotice,
  isRefreshing,
  onRefresh,
}: {
  backendNotice: DashboardBackendNotice
  isRefreshing: boolean
  onRefresh: () => void | Promise<void>
}) {
  return (
    <div className="space-y-6">
      <WalletAccountCard />

      <SessionApprovalCard compact surface="dashboard" />

      <Card className="glass-card border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Backend Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "rounded-2xl border p-4",
              toneStyles[backendNotice.tone],
            )}
          >
            <div className="flex items-start gap-3">
              {backendNotice.tone === "danger" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                <p className="font-semibold">{backendNotice.title}</p>
                <p className="mt-1 text-sm opacity-85">
                  {backendNotice.description}
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full border-white/10 bg-white/5"
            onClick={() => void onRefresh()}
          >
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh Workspace
          </Button>

          <Button asChild className="w-full">
            <Link href="/dashboard/services/new">Create Service</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
