"use client"

import type { ReactNode } from "react"
import { WalletRequiredState } from "@/components/states/WalletRequiredState"
import { useWalletConnectionFlow } from "@/hooks/wallet"

type WalletRouteGuardProps = {
  children: ReactNode
  requireExpectedAppchain?: boolean
  title?: string
  description?: string
  secondaryHref?: string
  secondaryLabel?: string
  fallback?: ReactNode
}

export function WalletRouteGuard({
  children,
  requireExpectedAppchain = true,
  title,
  description,
  secondaryHref,
  secondaryLabel,
  fallback,
}: WalletRouteGuardProps) {
  const wallet = useWalletConnectionFlow()

  if (!wallet.isConfigured) {
    return (
      <>
        {fallback ?? (
          <WalletRequiredState
            mode="configuration"
            description={wallet.networkMessage.description}
            secondaryHref={secondaryHref}
            secondaryLabel={secondaryLabel}
          />
        )}
      </>
    )
  }

  if (!wallet.isConnected) {
    return (
      <>
        {fallback ?? (
          <WalletRequiredState
            mode="disconnected"
            title={title}
            description={description}
            secondaryHref={secondaryHref}
            secondaryLabel={secondaryLabel}
          />
        )}
      </>
    )
  }

  if (requireExpectedAppchain && !wallet.isOnExpectedAppchain) {
    return (
      <>
        {fallback ?? (
          <WalletRequiredState
            mode="wrong_network"
            title={title}
            description={wallet.networkMessage.description}
            secondaryHref={secondaryHref}
            secondaryLabel={secondaryLabel}
          />
        )}
      </>
    )
  }

  return <>{children}</>
}
