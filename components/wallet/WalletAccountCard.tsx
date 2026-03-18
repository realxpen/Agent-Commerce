"use client"

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  LogOut,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import { useBackendAuth } from "@/hooks/auth"
import { Button } from "@/components/ui/button"
import { WalletStatusBadge } from "@/components/wallet/WalletStatusBadge"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { cn } from "@/lib/utils"

type WalletAccountCardProps = {
  className?: string
  compact?: boolean
}

export function WalletAccountCard({
  className,
  compact = false,
}: WalletAccountCardProps) {
  const {
    connect,
    disconnect,
    displayName,
    errorMessage,
    hexAddress,
    initiaAddress,
    isBusy,
    isConnected,
    isConfigured,
    networkMessage,
    openWallet,
    shortAddress,
    walletStatusDescription,
  } = useWalletConnectionFlow()
  const auth = useBackendAuth()

  if (!isConnected) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Connect your account</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Use InterwovenKit to unlock checkout, agent creation, and auto-signing flows.
            </p>
          </div>
          <Wallet className="size-4 shrink-0 text-indigo-400" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <WalletStatusBadge />
          <Button
            className="min-w-32"
            onClick={() => void connect()}
            size={compact ? "sm" : "default"}
            type="button"
            variant="glass"
            disabled={!isConfigured}
          >
            {!isConfigured ? (
              "Setup Required"
            ) : isBusy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Connecting
              </>
            ) : (
              <>
                Connect
                <ChevronRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </div>

        {errorMessage || !isConfigured ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/15 bg-rose-500/5 p-3 text-xs text-rose-300">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{errorMessage ?? networkMessage.description}</span>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <WalletStatusBadge />
          </div>
          <p className="mt-1 truncate font-mono text-xs text-white/45">
            {shortAddress ?? initiaAddress ?? hexAddress}
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-indigo-500/10">
          <Wallet className="size-4 text-indigo-300" />
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-white/45">
        {walletStatusDescription}
      </p>

      {!compact ? (
        <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-black/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              Initia Address
            </span>
            <span className="truncate font-mono text-[11px] text-white/55">
              {initiaAddress ?? "Not available yet"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              Hex Address
            </span>
            <span className="truncate font-mono text-[11px] text-white/55">
              {hexAddress ?? "Not available yet"}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              Backend Sync
            </p>
            <p className="mt-1 text-sm text-white">
              {auth.isAuthenticated
                ? "Creator data is unlocked"
                : "Unlock creator actions"}
            </p>
            <p className="mt-1 text-xs text-white/45">
              {auth.isAuthenticated
                ? "Protected backend actions now follow your connected wallet."
                : "Sign one wallet message so drafts, orders, and dashboard data can sync to your account."}
            </p>
          </div>
          <div className="mt-0.5">
            {auth.isAuthenticated ? (
              <CheckCircle2 className="size-4 text-emerald-400" />
            ) : (
              <ShieldCheck className="size-4 text-indigo-300" />
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {auth.isAuthenticated ? (
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
              Backend synced for {auth.currentSession?.user.displayName ?? "this wallet"}
            </div>
          ) : (
            <Button
              onClick={() => void auth.signIn()}
              size={compact ? "sm" : "default"}
              type="button"
              variant="glass"
              disabled={auth.isSigningIn}
            >
              {auth.isSigningIn ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Unlocking
                </>
              ) : (
                "Unlock Backend Sync"
              )}
            </Button>
          )}

          {auth.isAuthenticated ? (
            <Button
              className="border-white/10 bg-white/5 text-white/70"
              onClick={() => auth.signOut()}
              size={compact ? "sm" : "default"}
              type="button"
              variant="outline"
            >
              Sign Out
            </Button>
          ) : null}
        </div>

        {auth.errorMessage ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 text-xs text-amber-200">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{auth.errorMessage}</span>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/15 bg-rose-500/5 p-3 text-xs text-rose-300">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <Button
          className="flex-1"
          onClick={() => void openWallet()}
          size={compact ? "sm" : "default"}
          type="button"
          variant="glass"
        >
          {isBusy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <ExternalLink className="mr-2 size-4" />
          )}
          Open Wallet
        </Button>
        <Button
          className="border-white/10 text-white/70 hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-300"
          onClick={() => void disconnect()}
          size={compact ? "sm" : "default"}
          type="button"
          variant="outline"
        >
          <LogOut className="mr-2 size-4" />
          Disconnect
        </Button>
      </div>
    </div>
  )
}
