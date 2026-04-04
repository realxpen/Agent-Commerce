"use client"

import { Wallet } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { WalletAccountCard } from "@/components/wallet/WalletAccountCard"
import { WalletStatusBadge } from "@/components/wallet/WalletStatusBadge"
import { useWalletConnectionFlow } from "@/hooks/wallet"

type WalletAccountMenuProps = {
  className?: string
}

export function WalletAccountMenu({ className }: WalletAccountMenuProps) {
  const { displayName, isConnected, shortAddress, username, resolvedUsername } =
    useWalletConnectionFlow()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={className}
          size="sm"
          type="button"
          variant="glass"
        >
          <Wallet className="mr-2 size-4" />
          {isConnected && (username || resolvedUsername) ? (
            <span className="mr-2 hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300 sm:inline-flex">
              .init
            </span>
          ) : null}
          <span className="max-w-32 truncate">
            {isConnected ? displayName : "Wallet"}
          </span>
          {isConnected ? (
            <span className="ml-2 hidden font-mono text-[11px] text-white/45 sm:inline">
              {shortAddress}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm border-white/10 bg-[#050505]/95 p-0">
        <DialogHeader className="border-b border-white/5 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base font-semibold">Wallet</DialogTitle>
              <DialogDescription>
                Keep payment and signing flow simple for customers.
              </DialogDescription>
            </div>
            <WalletStatusBadge />
          </div>
        </DialogHeader>
        <div className="p-5">
          <WalletAccountCard compact />
        </div>
      </DialogContent>
    </Dialog>
  )
}
