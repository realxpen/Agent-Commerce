"use client"

import {
  Activity,
  Globe,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react"
import { SessionApprovalCard } from "@/components/session"
import { WalletAccountCard } from "@/components/wallet/WalletAccountCard"
import { useBackendAuth } from "@/hooks/auth"
import { useSessionApproval } from "@/hooks/session"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type StatusCardProps = {
  icon: typeof Wallet
  eyebrow: string
  title: string
  body: string
  tone?: "success" | "warning" | "outline"
}

function StatusCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  tone = "outline",
}: StatusCardProps) {
  return (
    <Card className="glass-card border-white/5">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white/55">
            <Icon className="size-4 text-indigo-300" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
              {eyebrow}
            </p>
          </div>
          <Badge variant={tone} className="border-white/10 bg-white/[0.03]">
            {title}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-white/60">{body}</p>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const session = useSessionApproval({ surface: "settings" })
  const auth = useBackendAuth()
  const wallet = useWalletConnectionFlow()

  const backendStatus = auth.isAuthenticated
    ? "Unlocked"
    : auth.isSigningIn
      ? "Unlocking"
      : "Locked"
  const backendTone = auth.isAuthenticated
    ? ("success" as const)
    : ("warning" as const)
  const autoSignTone =
    session.statusTone === "secondary" ? "outline" : session.statusTone

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
              <Sparkles className="mr-1 size-3" />
              Wallet & Session
            </Badge>
            <Badge variant={autoSignTone} className="border-white/10 bg-white/[0.03]">
              {session.statusLabel}
            </Badge>
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Live wallet controls and smoother repeat actions
          </h1>
          <p className="max-w-3xl text-sm text-white/45">
            Manage the connected wallet, backend sync, and the real auto-sign
            approval that makes repeat create, checkout, and order actions feel
            lighter during this session.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatusCard
          icon={Wallet}
          eyebrow="Backend Sync"
          title={backendStatus}
          body={
            auth.isAuthenticated
              ? "Protected creator data is unlocked for the connected wallet, so dashboard, order, and treasury actions can sync to your backend account."
              : "Unlock backend sync with one wallet signature before expecting live creator data or session approvals to sync across the app."
          }
          tone={backendTone}
        />
        <StatusCard
          icon={ShieldCheck}
          eyebrow="Smooth Actions"
          title={session.statusLabel}
          body={
            session.isSessionActive
              ? `Auto-sign approval is live for ${session.sessionRemainingLabel}. ${session.session.scopeLabel}.`
              : "Approve once to keep repeat checkout and agent actions feeling smoother until the session ends or you turn it off."
          }
          tone={autoSignTone}
        />
        <StatusCard
          icon={Globe}
          eyebrow="Appchain"
          title={wallet.networkMessage.label}
          body={wallet.networkMessage.description}
          tone={wallet.isOnExpectedAppchain ? "success" : "warning"}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <WalletAccountCard />

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg">Where smooth actions apply</CardTitle>
              <CardDescription className="text-white/45">
                This approval only affects flows that already belong to your
                connected wallet session.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Checkout</p>
                <p className="mt-1 text-sm leading-relaxed text-white/55">
                  Repeat orders and customer follow-up confirmations can move
                  with less friction while the session stays active.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Agent setup</p>
                <p className="mt-1 text-sm leading-relaxed text-white/55">
                  Creating agents and services can reuse the approved session
                  instead of feeling like a fresh wallet ritual every time.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Order actions</p>
                <p className="mt-1 text-sm leading-relaxed text-white/55">
                  Owner-side order updates and customer confirmations can keep
                  flowing while payment and settlement still stay on-chain.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Last session use</p>
                <p className="mt-1 text-sm leading-relaxed text-white/55">
                  {session.lastUsedLabel}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <SessionApprovalCard surface="settings" />

          <Card className="glass-card border-white/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Activity className="size-5 text-indigo-300" />
                <div>
                  <CardTitle className="text-lg">Current approval scope</CardTitle>
                  <CardDescription className="text-white/45">
                    Live values from the connected wallet and synced backend session.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  Coverage
                </p>
                <p className="mt-2 text-sm text-white/85">
                  {session.session.scopeLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  Limits
                </p>
                <p className="mt-2 text-sm text-white/85">
                  {session.session.limitLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  Backend sync
                </p>
                <p className="mt-2 text-sm text-white/85">
                  {session.session.backendSyncStatus === "synced"
                    ? "Session details are synced to the backend."
                    : session.session.backendSyncStatus === "pending"
                      ? "Wallet approval is active and backend sync is still finishing."
                      : session.session.backendSyncStatus === "error"
                        ? "Wallet approval is active, but backend sync needs another retry."
                        : "No backend session approval is stored yet."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  Session window
                </p>
                <p className="mt-2 text-sm text-white/85">
                  {session.isSessionActive
                    ? session.sessionRemainingLabel
                    : "Not active yet"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
