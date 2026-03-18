"use client"

import { SessionStatusBadge } from "@/components/session"
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton"
import { WalletStatusBadge } from "@/components/wallet/WalletStatusBadge"
import type { SessionSurface } from "@/lib/session/types"
import { cn } from "@/lib/utils"

export function WalletSessionControls({
  surface = "general",
  showWalletStatus = true,
  showSessionStatus = true,
  showConnectButton = true,
  showRemaining = false,
  className,
}: {
  surface?: SessionSurface
  showWalletStatus?: boolean
  showSessionStatus?: boolean
  showConnectButton?: boolean
  showRemaining?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showWalletStatus ? <WalletStatusBadge /> : null}
      {showSessionStatus ? (
        <SessionStatusBadge surface={surface} showRemaining={showRemaining} />
      ) : null}
      {showConnectButton ? <ConnectWalletButton /> : null}
    </div>
  )
}
