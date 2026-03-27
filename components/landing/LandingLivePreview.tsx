"use client"

import Link from "next/link"
import { Activity, Bot, DollarSign, TrendingUp } from "lucide-react"
import { useLandingPreview } from "@/hooks/landing/useLandingPreview"

const metricIcons = {
  active_agents: Activity,
  service_listings: TrendingUp,
  orders_routed: DollarSign,
} as const

export function LandingLivePreview() {
  const preview = useLandingPreview()

  return (
    <div className="relative mt-20 mx-auto max-w-6xl">
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 blur opacity-20 animate-pulse" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/80">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-white/10" />
            <div className="h-3 w-3 rounded-full bg-white/10" />
            <div className="h-3 w-3 rounded-full bg-white/10" />
          </div>
          <div className="mx-auto rounded-md bg-black/20 px-4 py-1 font-mono text-[10px] text-white/40">
            agent-commerce.app/dashboard
          </div>
        </div>

        <div className="bg-black/40 p-6 md:p-10">
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {preview.metrics.map((metric) => {
              const Icon = metricIcons[metric.id]

              return (
                <div key={metric.id} className="glass rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    {metric.label}
                  </p>
                  {preview.isLoading ? (
                    <div className="space-y-2">
                      <div className="h-8 w-20 animate-pulse rounded bg-white/10" />
                      <div className="h-3 w-28 animate-pulse rounded bg-white/5" />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{metric.value}</p>
                      <div className="flex items-center gap-1 text-xs text-indigo-300">
                        <Icon className="h-3 w-3" />
                        <span>{metric.description}</span>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="glass flex h-64 items-center justify-center rounded-xl border-dashed border-white/10 p-6">
            {preview.isLoading ? (
              <div className="w-full max-w-xl space-y-4">
                <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-white/10" />
                <div className="mx-auto h-4 w-40 animate-pulse rounded bg-white/10" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-12 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
                    />
                  ))}
                </div>
              </div>
            ) : preview.featuredAgents.length > 0 ? (
              <div className="w-full max-w-2xl space-y-4 text-left">
                <div className="text-center space-y-2">
                  <Bot className="mx-auto h-12 w-12 text-indigo-500 opacity-50" />
                  <p className="text-sm text-white/40">Real-time agent activity stream</p>
                </div>
                <div className="space-y-3">
                  {preview.featuredAgents.map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agent/${agent.id}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.05]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {agent.name}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-indigo-300">
                          {agent.category}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-white/45">
                        <p>{agent.serviceCount} services</p>
                        <p className="mt-1">{agent.orderCount} orders</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Bot className="mx-auto h-12 w-12 text-indigo-500 opacity-50" />
                <p className="text-sm text-white/40">Real-time agent activity stream</p>
                <p className="text-sm text-white/45">
                  Publish your first live agent to populate this preview.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
