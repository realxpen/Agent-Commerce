"use client"

import { useMemo, useRef, type ChangeEvent } from "react"
import { Info, Sparkles } from "lucide-react"
import { WalletActionButton } from "@/components/guards"
import { TransactionStatusPanel } from "@/components/transactions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSession } from "@/components/providers/SessionProvider"
import type { OrderViewerRole } from "@/hooks/orders"
import type { TransactionState } from "@/lib/transactions/types"

type NextActionKind =
  | "wait_payment"
  | "wait_delivery"
  | "mark_in_progress"
  | "resume_fulfillment"
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
  viewerRoleLabel,
  viewerRoleDescription,
  nextAction,
  deliveryUrlInput,
  onDeliveryUrlChange,
  deliveryTextInput,
  onDeliveryTextChange,
  onMarkInProgress,
  onResumeFulfillment,
  onMarkDelivered,
  onConfirmCompletion,
  isResumingFulfillment = false,
  activeTransaction,
  actionNotice,
  actionWarning,
  deliverableUploadHint,
  onUploadDeliverables,
  isUploadingDeliverables = false,
  deliverableUploadError,
}: {
  viewerRole: OrderViewerRole | null
  viewerRoleLabel: string
  viewerRoleDescription: string
  nextAction: NextActionShape
  deliveryUrlInput: string
  onDeliveryUrlChange: (value: string) => void
  deliveryTextInput: string
  onDeliveryTextChange: (value: string) => void
  onMarkInProgress: () => void | Promise<unknown>
  onResumeFulfillment: () => void | Promise<unknown>
  onMarkDelivered: () => void | Promise<unknown>
  onConfirmCompletion: () => void | Promise<unknown>
  isResumingFulfillment?: boolean
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
  deliverableUploadHint?: string | null
  onUploadDeliverables?: (files: File[]) => void | Promise<unknown>
  isUploadingDeliverables?: boolean
  deliverableUploadError?: string | null
}) {
  const { isSessionActive } = useSession()
  const deliverableFileInputRef = useRef<HTMLInputElement | null>(null)

  const actionHandler = useMemo(() => {
    switch (nextAction.kind) {
      case "mark_in_progress":
        return onMarkInProgress
      case "resume_fulfillment":
        return onResumeFulfillment
      case "mark_delivered":
        return onMarkDelivered
      case "confirm_completion":
        return onConfirmCompletion
      default:
        return null
    }
  }, [
    nextAction.kind,
    onConfirmCompletion,
    onMarkDelivered,
    onMarkInProgress,
    onResumeFulfillment,
  ])

  const handleDeliverableFileSelection = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0 || !onUploadDeliverables) {
      return
    }

    const files = Array.from(fileList)
    event.target.value = ""

    try {
      await onUploadDeliverables(files)
    } catch {
      // Upload errors are surfaced through the existing inline error state.
    }
  }

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
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Active Role
            </p>
            <p className="mt-2 font-semibold text-white">{viewerRoleLabel}</p>
            <p className="mt-2">{viewerRoleDescription}</p>
            {viewerRole === null ? (
              <p className="mt-3 text-xs text-amber-200">
                Live order actions stay hidden until AgentCommerce can confirm
                who you are for this order.
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {nextAction.requiresDeliveryInput ? (
          <div className="grid gap-4">
            {onUploadDeliverables ? (
              <>
                <input
                  ref={deliverableFileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    void handleDeliverableFileSelection(event)
                  }}
                />
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                        Deliverable Files
                      </p>
                      <p className="mt-2">
                        {deliverableUploadHint ??
                          "Upload the final customer-ready files here. AgentCommerce will attach them to this delivery and make them previewable from the order page."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/10 bg-white/5"
                      onClick={() => deliverableFileInputRef.current?.click()}
                      disabled={isUploadingDeliverables}
                    >
                      {isUploadingDeliverables
                        ? "Uploading..."
                        : "Upload Deliverable"}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            {deliverableUploadError ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                {deliverableUploadError}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                Primary delivery link
              </label>
              <input
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/25"
                placeholder="https://... or let uploads fill this automatically"
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

        {actionHandler &&
        nextAction.ctaLabel &&
        nextAction.kind === "resume_fulfillment" ? (
          <Button
            className="w-full"
            disabled={nextAction.actionDisabled || isResumingFulfillment}
            onClick={() => void actionHandler()}
            type="button"
          >
            {isResumingFulfillment ? "Resuming Fulfillment..." : nextAction.ctaLabel}
          </Button>
        ) : null}

        {actionHandler &&
        nextAction.ctaLabel &&
        nextAction.kind !== "resume_fulfillment" ? (
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
