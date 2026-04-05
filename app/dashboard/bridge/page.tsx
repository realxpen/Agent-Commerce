"use client"

import Link from "next/link"
import {
  ArrowRightLeft,
  ExternalLink,
  Sparkles,
  Wallet,
  Waypoints,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { agentCommerceConfig } from "@/lib/appchain/config"

export default function BridgePage() {
  const wallet = useWalletConnectionFlow()
  const bridgeDefaults = {
    srcChainId: agentCommerceConfig.bridge.defaultSourceChainId,
    srcDenom: agentCommerceConfig.bridge.defaultSourceDenom,
  }

  const primaryAction = !wallet.isConnected
    ? {
        label: "Connect Wallet",
        handler: () => void wallet.connect(),
      }
    : !wallet.isOnExpectedAppchain
      ? {
          label: `Switch to ${agentCommerceConfig.appchain.displayName}`,
          handler: () => void wallet.switchNetwork(),
        }
      : {
          label: `Bridge ${agentCommerceConfig.bridge.defaultSourceDenom}`,
          handler: () => void wallet.openBridge(bridgeDefaults),
        }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
          <Zap className="h-3.5 w-3.5" />
          Live Bridge Entry
        </div>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Move funds onto your AgentCommerce rollup
        </h1>
        <p className="max-w-2xl text-sm text-white/50">
          This page now launches the real InterwovenKit bridge flow. For local
          or public appchain funding, AgentCommerce pre-fills a public Initia
          testnet source asset and hands the rest of the transfer to the live
          bridge modal.
        </p>
      </div>

      <Card className="glass-card overflow-hidden border-emerald-500/15 shadow-2xl">
        <CardHeader className="space-y-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display font-bold">
                Real bridge launch
              </CardTitle>
              <p className="mt-1 text-sm text-white/50">
                Wallet status is live, and the bridge modal is live.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
                <Wallet className="h-4 w-4 text-indigo-300" />
                Wallet
              </div>
              <p className="mt-3 text-lg font-semibold text-white">
                {wallet.isConnected ? wallet.displayName : "Not connected"}
              </p>
              <p className="mt-2 text-sm text-white/50">
                {wallet.walletStatusDescription}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
                <Waypoints className="h-4 w-4 text-indigo-300" />
                Source Asset
              </div>
              <p className="mt-3 text-lg font-semibold text-white">
                {agentCommerceConfig.bridge.defaultSourceDenom}
              </p>
              <p className="mt-2 text-sm text-white/50">
                From {agentCommerceConfig.bridge.defaultSourceLabel} (
                {agentCommerceConfig.bridge.defaultSourceChainId})
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
                <Sparkles className="h-4 w-4 text-indigo-300" />
                Destination
              </div>
              <p className="mt-3 text-lg font-semibold text-white">
                {wallet.expectedNetworkLabel}
              </p>
              <p className="mt-2 text-sm text-white/50">
                Chain ID {wallet.expectedChainId} on {wallet.expectedNetworkLabel}.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              What is live right now
            </p>
            <div className="mt-4 grid gap-3 text-sm text-white/60 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-semibold text-white">Bridge provider</p>
                <p className="mt-2">
                  InterwovenKit opens the actual bridge modal and handles quote
                  discovery, routing, and signing for supported assets.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-semibold text-white">Local destination</p>
                <p className="mt-2">
                  Destination network metadata comes from the live app config:
                  {` ${agentCommerceConfig.appchain.displayName}`}.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/65">
            <p className="font-semibold text-white">
              Scope of this page
            </p>
            <p className="mt-2">
              AgentCommerce launches the real bridge modal for inbound funding to
              the appchain. It does not yet add custom quote rendering, transfer
              history, or a separate in-house relay tracker on this page.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={primaryAction.handler}
              className="h-12 flex-1 text-base font-semibold"
            >
              {primaryAction.label}
            </Button>
            {wallet.isConnected && wallet.isOnExpectedAppchain ? (
              <Button
                variant="outline"
                className="h-12 border-white/10 bg-white/5"
                onClick={() => void wallet.openBridge()}
              >
                Open Generic Bridge
              </Button>
            ) : null}
            <Button asChild variant="outline" className="h-12 border-white/10 bg-white/5">
              <Link href="/dashboard">
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-12">
              <Link href="/marketplace">
                Continue without bridge
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {wallet.errorMessage ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {wallet.errorMessage}
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
            <p className="font-semibold text-white">Testing note</p>
            <p className="mt-2">
              For public deployments, bridge from Initia Testnet into
              {` ${agentCommerceConfig.appchain.displayName}`}. For local
              testing, you can still use the funding helper in Settings. Keep
              the wallet connected and on the AgentCommerce appchain before
              launching the bridge for the smoothest handoff.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/40">
              <Zap className="h-3.5 w-3.5 text-indigo-300" />
              RPC target: {agentCommerceConfig.appchain.rpcUrl}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
