"use client"

import { AlertCircle, CheckCircle2, Info, RefreshCcw, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type StatusNoticeTone = "neutral" | "warning" | "danger" | "success"

const toneStyles = {
  neutral: "border-white/10 bg-white/[0.03] text-white/75",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-100",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-100",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
} as const

function StatusIcon({ tone }: { tone: StatusNoticeTone }) {
  if (tone === "danger") {
    return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
  }

  if (tone === "warning") {
    return <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
  }

  if (tone === "success") {
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
  }

  return <Info className="mt-0.5 h-4 w-4 shrink-0" />
}

export function StatusNoticeCard({
  title,
  description,
  tone = "neutral",
  className,
  actionLabel,
  onAction,
  isActionLoading = false,
}: {
  title: string
  description: string
  tone?: StatusNoticeTone
  className?: string
  actionLabel?: string
  onAction?: (() => void | Promise<void>) | null
  isActionLoading?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-6",
        toneStyles[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <StatusIcon tone={tone} />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-2 text-sm opacity-85">{description}</p>
          </div>
        </div>

        {actionLabel && onAction ? (
          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-white/5"
            onClick={() => void onAction()}
            disabled={isActionLoading}
          >
            <RefreshCcw
              className={cn(
                "mr-2 h-4 w-4",
                isActionLoading && "animate-spin",
              )}
            />
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
