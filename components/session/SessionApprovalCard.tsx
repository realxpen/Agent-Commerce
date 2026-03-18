"use client"

import { ShieldCheck, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SessionStatusBadge } from "@/components/session/SessionStatusBadge"
import { useSessionApproval } from "@/hooks/session"
import type { SessionSurface } from "@/lib/session/types"
import { cn } from "@/lib/utils"

export function SessionApprovalCard({
  surface = "general",
  compact = false,
  className,
}: {
  surface?: SessionSurface
  compact?: boolean
  className?: string
}) {
  const session = useSessionApproval({ surface })

  if (compact) {
    return (
      <Card
        className={cn(
          "glass-card border-white/5 bg-white/[0.02] shadow-none",
          className,
        )}
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-400" />
                <p className="text-sm font-semibold text-white">
                  Smooth repeat actions
                </p>
              </div>
              <p className="text-sm leading-relaxed text-white/55">
                {session.description}
              </p>
            </div>
            <SessionStatusBadge surface={surface} showRemaining />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              How it works
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Approve once, then repeat steps can feel almost invisible until this
              session ends.
            </p>
          </div>

          <Button
            className="w-full"
            disabled={session.primaryActionDisabled}
            onClick={() => void session.onPrimaryAction()}
          >
            {session.primaryActionLabel}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "glass-card border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-white/[0.02]",
        className,
      )}
    >
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                Auto-Signing
              </span>
            </div>
            <CardTitle className="text-2xl font-display font-bold">
              {session.title}
            </CardTitle>
            <CardDescription className="max-w-2xl text-white/55">
              {session.description}
            </CardDescription>
          </div>
          <SessionStatusBadge surface={surface} showRemaining />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              Coverage
            </p>
            <p className="mt-2 text-sm font-medium text-white/85">
              {session.session.scopeLabel}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              Session Window
            </p>
            <p className="mt-2 text-sm font-medium text-white/85">
              {session.isSessionActive
                ? session.sessionRemainingLabel
                : "Not active yet"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              Last Used
            </p>
            <p className="mt-2 text-sm font-medium text-white/85">
              {session.lastUsedLabel}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
            <div>
              <p className="font-semibold text-white">Simple and controlled</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                {session.helperText}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {session.trustBullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/60"
              >
                {bullet}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="sm:min-w-56"
            disabled={session.primaryActionDisabled}
            onClick={() => void session.onPrimaryAction()}
          >
            {session.primaryActionLabel}
          </Button>
          {session.canShowSecondaryAction ? (
            <Button
              variant="outline"
              className="border-white/10 bg-white/5"
              onClick={() => void session.turnOff()}
            >
              Turn off anytime
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
