"use client"

import Link from "next/link"
import { Compass, Globe, Lock, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { WalletStatusBadge } from "@/components/wallet/WalletStatusBadge"
import { useWalletConnectionFlow } from "@/hooks/wallet"

type WalletRequiredStateProps = {
  mode?: "configuration" | "disconnected" | "wrong_network"
  eyebrow?: string
  title?: string
  description?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
}

export function WalletRequiredState({
  mode,
  eyebrow,
  title,
  description,
  primaryLabel,
  secondaryHref = "/marketplace",
  secondaryLabel = "Explore Marketplace",
}: WalletRequiredStateProps) {
  const wallet = useWalletConnectionFlow()
  const resolvedMode =
    mode ??
    (!wallet.isConfigured
      ? "configuration"
      : !wallet.isConnected
        ? "disconnected"
        : "wrong_network")

  const copy =
    resolvedMode === "configuration"
      ? {
          eyebrow: eyebrow ?? "Setup Required",
          title: title ?? "Finish the frontend setup first",
          description:
            description ??
            wallet.networkMessage.description,
          primaryLabel: primaryLabel ?? "Configuration Needed",
          Icon: Globe,
        }
      : resolvedMode === "wrong_network"
      ? {
          eyebrow: eyebrow ?? "Switch Network",
          title: title ?? "Open your workspace on the right appchain",
          description:
            description ??
            wallet.networkMessage.description,
          primaryLabel: primaryLabel ?? "Switch Network",
          Icon: Globe,
        }
      : {
          eyebrow: eyebrow ?? "Connect Wallet",
          title: title ?? "Connect your account to continue",
          description:
            description ??
            "This part of AgentCommerce is wallet-aware. Connect once to unlock your workspace and on-chain actions.",
          primaryLabel: primaryLabel ?? "Connect Wallet",
          Icon: Wallet,
        }

  const handlePrimaryAction = () => {
    if (resolvedMode === "configuration") {
      return
    }

    if (resolvedMode === "wrong_network") {
      return wallet.switchNetwork()
    }

    return wallet.connect()
  }

  return (
    <Card className="glass-card overflow-hidden border-white/5">
      <CardContent className="p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">
              <copy.Icon className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </div>

            <div>
              <h2 className="text-3xl font-display font-bold text-white">
                {copy.title}
              </h2>
              <p className="mt-3 text-white/50">{copy.description}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                "Public pages like the landing page and marketplace stay open to everyone.",
                "Wallet-aware pages only ask for connection when you reach protected actions.",
                "You stay in control and can disconnect whenever you want.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10">
                <Lock className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  Protected but friendly
                </p>
                <p className="mt-1 text-sm text-white/45">
                  Protected actions never crash. AgentCommerce will guide the
                  next step instead.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <WalletStatusBadge />
            </div>

            <div className="mt-6 space-y-3">
              <Button
                className="w-full"
                onClick={() => void handlePrimaryAction()}
                type="button"
                disabled={resolvedMode === "configuration"}
              >
                {copy.primaryLabel}
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-white/10 bg-white/5"
              >
                <Link href={secondaryHref}>
                  <Compass className="mr-2 h-4 w-4" />
                  {secondaryLabel}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
