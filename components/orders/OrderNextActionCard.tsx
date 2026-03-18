"use client"

import { useMemo } from "react"
import { Info, Sparkles } from "lucide-react"
import { WalletActionButton } from "@/components/guards"
import { TransactionStatusPanel } from "@/components/transactions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "@/components/providers/SessionProvider"
import type { OrderViewerRole } from "@/hooks/orders"
import type { TransactionState } from "@/lib/transactions/types"

type NextActionKind =
  | "wait_payment"
  | "wait_delivery"
  | "mark_in_progress"
  | "mark_delivered"
  | "confirm_completion"
  | "wait_customer"
  | "completed"
  | "cancelled"
  | "syncing"

type NextActionShape = {
  kind: NextActionKind
  title: string
  description: string
  ctaLabel?: string
  helperText?: string
  requiresDeliveryInput?: boolean
  actionDisabled?: boolean
}

export function OrderNextActionCard({
  viewerRole,
  onViewerRoleChange,
  nextAction,
  deliveryUrlInput,
  onDeliveryUrlChange,
  deliveryTextInput,
  onDeliveryTextChange,
  onMarkInProgress,
  onMarkDelivered,
  onConfirmCompletion,
  activeTransaction,
  actionNotice,
  actionWarning,
}: {
  viewerRole: OrderViewerRole
  onViewerRoleChange: (role: OrderViewerRole) => void
  nextAction: NextActionShape
  deliveryUrlInput: string
  onDeliveryUrlChange: (value: string) => void
  deliveryTextInput: string
  onDeliveryTextChange: (value: string) => void
  onMarkInProgress: () => void | Promise<unknown>
  onMarkDelivered: () => void | Promise<unknown>
  onConfirmCompletion: () => void | Promise<unknown>
  activeTransaction: {
    key: string
    label: string
    action: {
      transaction: TransactionState
      isWorking: boolean
      isError: boolean
      isSuccess: boolean
      reset: () => void
    }
  } | null
  actionNotice?: string | null
  actionWarning?: string | null
}) {
  const { isSessionActive } = useSession()

  const actionHandler = useMemo(() => {
    switch (nextAction.kind) {
      case "mark_in_progress":
        return onMarkInProgress
      case "mark_delivered":
        return onMarkDelivered
      case "confirm_completion":
        return onConfirmCompletion
      default:
        return null
    }
  }, [nextAction.kind, onConfirmCompletion, onMarkDelivered, onMarkInProgress])

  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-300">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
              Next Step
            </span>
          </div>
          <CardTitle className="text-2xl font-display font-bold">
            {nextAction.title}
          </CardTitle>
          <CardDescription className="text-white/55">
            {nextAction.description}
          </CardDescription>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
            View this order as
          </p>
          <Tabs
            value={viewerRole}
            onValueChange={(value) =>
              onViewerRoleChange(value as OrderViewerRole)
            }
          >
            <TabsList className="grid w-full grid-cols-2 bg-white/[0.03]">
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="agent_owner">Agent Owner</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
            Role-aware actions are shown here in a lightweight preview mode until
            the full backend identity bridge is wired in.
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {nextAction.requiresDeliveryInput ? (
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                Delivery link
              </label>
              <input
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/25"
                placeholder="https://..."
                value={deliveryUrlInput}
                onChange={(event) => onDeliveryUrlChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                Delivery note
              </label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-white/25"
                placeholder="Add a short note or summary for the customer."
                value={deliveryTextInput}
                onChange={(event) => onDeliveryTextChange(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        {nextAction.helperText ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 text-indigo-400" />
              <p>{nextAction.helperText}</p>
            </div>
          </div>
        ) : null}

        {actionNotice ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
            {actionNotice}
          </div>
        ) : null}

        {actionWarning ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            {actionWarning}
          </div>
        ) : null}

        {actionHandler && nextAction.ctaLabel ? (
          <WalletActionButton
            className="w-full"
            connectLabel="Connect Wallet to Continue"
            onAuthorizedAction={actionHandler}
            disabled={nextAction.actionDisabled}
          >
            {nextAction.ctaLabel}
          </WalletActionButton>
        ) : null}

        {activeTransaction ? (
          <TransactionStatusPanel
            className="shadow-none"
            transaction={activeTransaction.action.transaction}
            helperMessage={`${activeTransaction.label} is being tracked on-chain so this order stays transparent and easy to trust.`}
            onRetry={
              activeTransaction.action.isError && actionHandler
                ? () => void actionHandler()
                : null
            }
            retryLabel={nextAction.ctaLabel}
            isAutoSigning={isSessionActive}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
