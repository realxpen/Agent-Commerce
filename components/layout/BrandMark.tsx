"use client"

import { Bot } from "lucide-react"
import { AppLink } from "@/components/layout/AppLink"
import { NativeFeaturePill } from "@/components/session"
import type { SessionSurface } from "@/lib/session/types"
import { cn } from "@/lib/utils"

export function BrandMark({
  href = "/",
  className,
  showNativeFeature = false,
  surface = "general",
}: {
  href?: string
  className?: string
  showNativeFeature?: boolean
  surface?: SessionSurface
}) {
  return (
    <AppLink href={href} className={cn("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
        <Bot className="h-5 w-5 text-white" />
      </div>
      <span className="font-display text-xl font-bold tracking-tight">
        AgentCommerce
      </span>
      {showNativeFeature ? <NativeFeaturePill surface={surface} /> : null}
    </AppLink>
  )
}
