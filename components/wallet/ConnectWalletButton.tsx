"use client"

import { AlertCircle, Loader2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WalletAccountMenu } from "@/components/wallet/WalletAccountMenu"
import { WalletStatusBadge } from "@/components/wallet/WalletStatusBadge"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { cn } from "@/lib/utils"

type ConnectWalletButtonProps = {
  className?: string
  showStatusBadge?: boolean
}

export function ConnectWalletButton({
  className,
  showStatusBadge = false,
}: ConnectWalletButtonProps) {
  const {
    connect,
    errorMessage,
    isBusy,
    isConnected,
    isConfigured,
    networkMessage,
  } = useWalletConnectionFlow()

  if (isConnected) {
    return <WalletAccountMenu className={className} />
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => void connect()}
          size="sm"
          type="button"
          variant="glass"
          disabled={!isConfigured}
        >
          {!isConfigured ? (
            <AlertCircle className="mr-2 size-4" />
          ) : isBusy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Wallet className="mr-2 size-4" />
          )}
          {!isConfigured
            ? "Setup Required"
            : isBusy
              ? "Connecting"
              : "Open Initia Wallet"}
        </Button>
        {showStatusBadge ? <WalletStatusBadge /> : null}
      </div>

      {!errorMessage && isConfigured ? (
        <div className="text-xs text-white/45">
          Use your existing EVM wallet, or continue with email, Google, or X
          through Initia Wallet.
        </div>
      ) : null}

      {errorMessage || !isConfigured ? (
        <div className="flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{errorMessage ?? networkMessage.description}</span>
        </div>
      ) : null}
    </div>
  )
}
