"use client"

import Link from "next/link"
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe,
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

const INITIA_WALLET_DOCS_URL = "https://docs.initia.xyz/home/tools/wallet"

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
    isUsernameLoading,
    networkMessage,
    isOnExpectedAppchain,
    openWallet,
    resolvedInitUsername,
    resolvedUsername,
    shortAddress,
    switchNetwork,
    username,
    walletStatusDescription,
  } = useWalletConnectionFlow()
  const auth = useBackendAuth()
  const visibleUsername = resolvedUsername
  const visibleInitUsername = resolvedInitUsername
  const hasDirectUsername = Boolean(username)

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
              Open Initia Wallet to continue with an existing EVM wallet, or
              sign in with email, Google, or X before unlocking checkout,
              creator actions, and auto-signing flows.
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
                Open Initia Wallet
                <ChevronRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            Existing EVM wallet
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            Email
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            Google
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            X
          </span>
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
          {visibleUsername ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                {hasDirectUsername ? "Init Username" : "Resolved on-chain"}
              </span>
              <span className="truncate text-xs font-medium text-emerald-200">
                {visibleInitUsername}
              </span>
            </div>
          ) : null}
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

      {isUsernameLoading ? (
        <div className="mt-4 rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-3">
          <div className="flex items-start gap-2">
            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-indigo-300" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-100">
                Checking Init usernames registry
              </p>
              <p className="mt-1 text-xs leading-relaxed text-indigo-100/75">
                AgentCommerce is resolving this wallet against the live Initia
                usernames module now.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!visibleUsername && !isUsernameLoading ? (
        <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-100">
                No Init username detected
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/75">
                This wallet is connected, but AgentCommerce is not receiving a
                live `.init` username from the wallet session or the on-chain
                usernames lookup yet. Create or connect a wallet profile with an
                Initia username, then reconnect to show your handle here.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size={compact ? "sm" : "default"} variant="glass">
                  <Link href={INITIA_WALLET_DOCS_URL} target="_blank">
                    Learn about Initia Wallet
                    <ExternalLink className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-black/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              Init Username
            </span>
            <span className="truncate text-[11px] font-medium text-white/70">
              {visibleInitUsername ?? "Not available yet"}
            </span>
          </div>
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
          onClick={() =>
            void (isOnExpectedAppchain ? openWallet() : switchNetwork())
          }
          size={compact ? "sm" : "default"}
          type="button"
          variant="glass"
        >
          {isBusy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : !isOnExpectedAppchain ? (
            <Globe className="mr-2 size-4" />
          ) : (
            <ExternalLink className="mr-2 size-4" />
          )}
          {isOnExpectedAppchain ? "Open Wallet" : "Switch Network"}
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
