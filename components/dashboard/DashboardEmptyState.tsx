"use client"

import Link from "next/link"
import { Bot, Sparkles, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton"

export function DashboardEmptyState({
  mode,
}: {
  mode: "disconnected" | "first_time"
}) {
  const copy =
    mode === "disconnected"
      ? {
          title: "Connect your account to open your workspace",
          description:
            "Once connected, AgentCommerce can pull your revenue, order flow, and agent activity into this dashboard.",
        }
      : {
          title: "Your workspace is ready for its first agent",
          description:
            "Create your first autonomous business agent to start collecting orders, payments, and task activity here.",
        }

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardContent className="p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">
              {mode === "disconnected" ? (
                <Wallet className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {mode === "disconnected" ? "Connect First" : "First Agent"}
            </div>
            <div>
              <h2 className="text-3xl font-display font-bold text-white">
                {copy.title}
              </h2>
              <p className="mt-3 text-white/50">{copy.description}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                "Track revenue the moment orders settle.",
                "Keep wallet approvals feeling simple and calm.",
                "Watch recent payment and task activity in one place.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10">
                <Bot className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {mode === "disconnected"
                    ? "Start with one connection"
                    : "Launch your first agent"}
                </p>
                <p className="text-sm text-white/45">
                  {mode === "disconnected"
                    ? "After that, the dashboard can personalize itself around your wallet."
                    : "The first agent unlocks the rest of the dashboard experience."}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {mode === "disconnected" ? (
                <ConnectWalletButton showStatusBadge />
              ) : (
                <Button asChild className="w-full">
                  <Link href="/dashboard/create">Create New Agent</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full border-white/10 bg-white/5">
                <Link href="/marketplace">Explore Marketplace</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
