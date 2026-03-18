"use client"

import { Sparkles, Zap } from "lucide-react"
import { useSessionApproval } from "@/hooks/session"
import type { SessionSurface } from "@/lib/session/types"
import { cn } from "@/lib/utils"

export function NativeFeaturePill({
  surface = "general",
  className,
}: {
  surface?: SessionSurface
  className?: string
}) {
  const session = useSessionApproval({ surface })

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        session.isSessionActive
          ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
          : "border-white/10 bg-white/[0.03] text-white/55",
        className,
      )}
    >
      {session.isSessionActive ? (
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      <span className="text-[9px] font-bold uppercase tracking-widest">
        Auto-Signing
      </span>
      {session.isSessionActive ? <Zap className="h-3 w-3" /> : null}
    </div>
  )
}
