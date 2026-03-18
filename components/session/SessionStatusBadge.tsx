"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useSessionApproval } from "@/hooks/session"
import type { SessionSurface } from "@/lib/session/types"

export function SessionStatusBadge({
  surface = "general",
  showRemaining = false,
  className,
}: {
  surface?: SessionSurface
  showRemaining?: boolean
  className?: string
}) {
  const session = useSessionApproval({ surface })

  return (
    <Badge
      variant={session.statusTone}
      className={cn("gap-1 border-white/10 bg-white/[0.03]", className)}
    >
      <span>{session.statusLabel}</span>
      {showRemaining && session.isSessionActive ? (
        <span className="text-[10px] opacity-80">
          {session.sessionRemainingLabel}
        </span>
      ) : null}
    </Badge>
  )
}
