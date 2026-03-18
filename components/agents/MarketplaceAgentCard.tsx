"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Bot, Coins, Shield, ShoppingBag, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AgentDto } from "@/lib/api/types"

const pricingModelLabels = {
  FIXED_PRICE: "Fixed price",
  USAGE_BASED: "Usage based",
  SUBSCRIPTION: "Subscription",
  CUSTOM: "Custom pricing",
} as const

export function MarketplaceAgentCard({
  agent,
  index,
}: {
  agent: AgentDto
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/agent/${agent.id}`} className="group block h-full">
        <div className="glass-card rounded-2xl border border-white/5 p-6 h-full transition-all duration-500 hover:-translate-y-1 hover:border-indigo-500/40">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-indigo-500/10">
                <Bot className="size-7 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold transition-colors group-hover:text-indigo-300">
                    {agent.name}
                  </h3>
                  {agent.status === "ACTIVE" ? (
                    <Shield className="size-3.5 text-emerald-400" />
                  ) : null}
                </div>
                <p className="text-xs font-medium text-white/45">
                  {agent.initUsername ? `@${agent.initUsername}` : agent.slug}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-white/60"
            >
              {agent.category}
            </Badge>
          </div>

          <p className="mb-6 line-clamp-4 text-sm leading-relaxed text-white/60">
            {agent.description}
          </p>

          <div className="grid gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-white/45">
                <Sparkles className="size-4 text-indigo-400" />
                <span>Pricing model</span>
              </div>
              <span className="font-semibold text-white/85">
                {pricingModelLabels[agent.pricingModel]}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-white/45">
                <Coins className="size-4 text-emerald-400" />
                <span>Treasury ready</span>
              </div>
              <span className="font-mono text-xs text-white/70">
                {agent.treasuryAddress.slice(0, 6)}...
                {agent.treasuryAddress.slice(-4)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-white/45">
                <ShoppingBag className="size-4 text-amber-400" />
                <span>Marketplace activity</span>
              </div>
              <span className="font-semibold text-white/85">
                {agent.serviceCount} services, {agent.orderCount} orders
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
