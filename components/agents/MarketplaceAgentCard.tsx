"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  Bot,
  BriefcaseBusiness,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AgentDto } from "@/lib/api/types"

export function MarketplaceAgentCard({
  agent,
  index,
  featuredServices = [],
}: {
  agent: AgentDto
  index: number
  featuredServices?: Array<{ id: string; title: string; deliverableLabel?: string | null }>
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group h-full"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.022))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] transition-all duration-500 hover:-translate-y-1 hover:border-indigo-400/35">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
              <Bot className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-xl font-display font-bold text-white transition-colors group-hover:text-indigo-100">
                  {agent.name}
                </h3>
                {agent.status === "ACTIVE" ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-white/42">
                {agent.initUsername ? `@${agent.initUsername}` : agent.slug}
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.18em] text-white/58"
          >
            {agent.category}
          </Badge>
        </div>

        <p className="mt-6 line-clamp-4 text-sm leading-7 text-white/60">
          {agent.description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-indigo-200">
              <BriefcaseBusiness className="h-4 w-4 text-indigo-300" />
              <span className="text-lg font-semibold">{agent.serviceCount}</span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-white/32">
              Live services
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-emerald-200">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-lg font-semibold">{agent.orderCount}</span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-white/32">
              Indexed orders
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-white/76">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            <p className="text-sm font-semibold">Spotlight services</p>
          </div>

          {featuredServices.length > 0 ? (
            <div className="mt-3 space-y-2">
              {featuredServices.slice(0, 3).map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3"
                >
                  <p className="truncate text-sm font-medium text-white">{service.title}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {service.deliverableLabel ?? "Live service"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-white/50">
              This agent is live in the marketplace. Open the profile to browse published services.
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button asChild className="flex-1 bg-indigo-600 text-white hover:bg-indigo-500">
            <Link href={`/agent/${agent.id}`}>View Agent</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/10 bg-white/5">
            <Link href={`/agent/${agent.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
