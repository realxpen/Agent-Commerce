"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useWalletConnectionFlow } from "@/hooks/wallet"

const badgeStyles = {
  configuration: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  connected: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  connecting: "border-indigo-500/20 bg-indigo-500/10 text-indigo-400",
  unsupported: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  error: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  disconnected: "border-white/10 bg-white/5 text-white/55",
} as const

type WalletStatusBadgeProps = {
  className?: string
}

export function WalletStatusBadge({ className }: WalletStatusBadgeProps) {
  const { walletState, walletStatusLabel } = useWalletConnectionFlow()

  return (
    <Badge
      className={cn(
        "gap-1.5 border text-[10px] font-bold uppercase tracking-[0.18em]",
        badgeStyles[walletState],
        className,
      )}
      variant="outline"
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          walletState === "connecting" && "animate-pulse bg-current",
          walletState !== "connecting" && "bg-current",
        )}
      />
      {walletStatusLabel}
    </Badge>
  )
}
