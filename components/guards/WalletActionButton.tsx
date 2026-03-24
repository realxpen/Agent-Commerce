"use client"

import type { ReactNode } from "react"
import { Globe, Loader2, Wallet } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { useWalletConnectionFlow } from "@/hooks/wallet"

type WalletActionButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  children: ReactNode
  onAuthorizedAction: () => unknown | Promise<unknown>
  requireExpectedAppchain?: boolean
  connectLabel?: ReactNode
  switchNetworkLabel?: ReactNode
}

export function WalletActionButton({
  children,
  onAuthorizedAction,
  requireExpectedAppchain = true,
  connectLabel = "Connect Wallet to Continue",
  switchNetworkLabel = "Switch to AgentCommerce Network",
  disabled,
  ...buttonProps
}: WalletActionButtonProps) {
  const wallet = useWalletConnectionFlow()

  const guardState = !wallet.isConfigured
    ? "configuration"
    : !wallet.isConnected
      ? "disconnected"
      : requireExpectedAppchain && !wallet.isOnExpectedAppchain
        ? "wrong_network"
        : "ready"

  const handleClick = () => {
    if (disabled) {
      return
    }

    if (guardState === "configuration") {
      return
    }

    if (guardState === "disconnected") {
      return wallet.connect()
    }

    if (guardState === "wrong_network") {
      return wallet.switchNetwork()
    }

    return onAuthorizedAction()
  }

  return (
    <Button
      {...buttonProps}
      disabled={disabled || wallet.isBusy || guardState === "configuration"}
      onClick={() => void handleClick()}
      type="button"
    >
      {wallet.isBusy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : guardState === "configuration" ? (
        <Globe className="mr-2 h-4 w-4" />
      ) : guardState === "disconnected" ? (
        <Wallet className="mr-2 h-4 w-4" />
      ) : guardState === "wrong_network" ? (
        <Globe className="mr-2 h-4 w-4" />
      ) : null}
      {guardState === "configuration"
        ? "Setup Required"
        : guardState === "disconnected"
        ? connectLabel
        : guardState === "wrong_network"
          ? switchNetworkLabel
          : children}
    </Button>
  )
}
