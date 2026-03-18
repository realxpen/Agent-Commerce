"use client"

import { ArrowRightLeft, Bot } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardActivityItem } from "@/hooks/dashboard"
import { cn } from "@/lib/utils"

const toneStyles = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  destructive: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  outline: "border-white/10 bg-white/[0.03] text-white/60",
} as const

export function DashboardRecentActivity({
  items,
  isLoading,
  emptyTitle,
  emptyDescription,
}: {
  items: DashboardActivityItem[]
  isLoading: boolean
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <Card className="glass-card border-white/5">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
        <CardDescription className="text-white/40">
          Payments and AI task updates from the backend activity stream.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
            <p className="font-semibold text-white">{emptyTitle}</p>
            <p className="mt-2 text-sm text-white/45">{emptyDescription}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10">
                    {item.kind === "payment" ? (
                      <ArrowRightLeft className="h-5 w-5 text-indigo-400" />
                    ) : (
                      <Bot className="h-5 w-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {item.amountLabel ? (
                    <p className="text-sm font-semibold text-white">
                      {item.amountLabel}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-[0.18em]",
                        toneStyles[item.tone],
                      )}
                    >
                      {item.kind}
                    </Badge>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/25">
                      {item.timeLabel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
