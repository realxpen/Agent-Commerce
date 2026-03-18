"use client"

import { Activity, Bot, DollarSign, ShoppingBag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardOverviewCard } from "@/hooks/dashboard"

const icons = {
  revenue: DollarSign,
  orders: ShoppingBag,
  active_agents: Bot,
  recent_activity: Activity,
} as const

export function DashboardOverviewCards({
  cards,
  isLoading,
}: {
  cards: DashboardOverviewCard[]
  isLoading: boolean
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = icons[card.id as keyof typeof icons] ?? Activity

        return (
          <Card
            key={card.id}
            className="glass-card border-white/5 hover:border-white/10 transition-colors"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-white/40">
                {card.label}
              </CardTitle>
              <Icon className="h-4 w-4 text-white/20" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-8 w-28 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-full animate-pulse rounded bg-white/5" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-display font-bold">
                    {card.value}
                  </div>
                  <p className="mt-2 text-sm text-white/45">
                    {card.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
