"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Lock } from "lucide-react"
import { useState } from "react"
import { WalletActionButton } from "@/components/guards"
import { HeaderBackLink } from "@/components/layout/HeaderBackLink"
import { WalletSessionControls } from "@/components/layout/WalletSessionControls"
import { Button } from "@/components/ui/button"
import { CheckoutSummary } from "@/components/orders/CheckoutSummary"
import { OrderSuccessConfirmation } from "@/components/orders/OrderSuccessConfirmation"
import { TransactionStatusCard } from "@/components/orders/TransactionStatusCard"
import { useSession } from "@/components/providers/SessionProvider"
import { SessionApprovalCard } from "@/components/session"
import { useCreateOrder, useOrderReferenceUploads } from "@/hooks/orders"
import type { OrderReference } from "@/lib/api/types"
import { parseCheckoutContext } from "@/lib/orders/checkout"

export default function CheckoutPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { isSessionActive } = useSession()
  const [customerNote, setCustomerNote] = useState("")
  const [customerReferences, setCustomerReferences] = useState<OrderReference[]>([])

  const checkout = parseCheckoutContext({
    serviceId: params.id,
    searchParams,
  })
  const createOrder = useCreateOrder(checkout)
  const referenceUploads = useOrderReferenceUploads()

  const backHref = checkout.agentSlug
    ? `/agent/${checkout.backendAgentId}`
    : "/marketplace"

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <HeaderBackLink href={backHref} label="Back to Agent" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Lock className="w-3 h-3" />
              <span>Secure Checkout</span>
            </div>
            <WalletSessionControls
              surface="checkout"
              showWalletStatus={false}
              showRemaining
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 pt-32">
        <div className="w-full max-w-5xl">
          {createOrder.isSuccess && createOrder.successResult ? (
            <OrderSuccessConfirmation
              orderDetailsHref={createOrder.successResult.orderDetailsHref}
              txHash={createOrder.successResult.txHash}
              title="Payment Successful"
              subtitle={`Your order for ${checkout.serviceTitle} has been submitted. We are taking you to the order details next.`}
            />
          ) : null}

          {createOrder.isWorking || createOrder.isError ? (
            <div className="max-w-2xl mx-auto">
              <TransactionStatusCard
                transaction={createOrder.transaction}
                warningMessage={createOrder.warningMessage}
                helperMessage={
                  isSessionActive && createOrder.transaction.isAwaitingWallet
                    ? "Auto-sign is available for this flow, so AgentCommerce may complete the wallet step with less manual friction."
                    : null
                }
                onRetry={
                  createOrder.isError && createOrder.canRetry
                    ? () => void createOrder.retry()
                    : null
                }
                isAutoSigning={isSessionActive}
              />

              {createOrder.isError ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={createOrder.reset}
                    className="border-white/10 bg-white/5"
                  >
                    Back to checkout
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {!createOrder.isWorking && !createOrder.isSuccess && !createOrder.isError ? (
            <div className="space-y-8">
              <SessionApprovalCard surface="checkout" />

              <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
                <CheckoutSummary
                  checkout={checkout}
                  customerNote={customerNote}
                  onCustomerNoteChange={setCustomerNote}
                  customerReferences={customerReferences}
                  onCustomerReferencesChange={setCustomerReferences}
                  isUploadingReferences={referenceUploads.isUploading}
                  referenceUploadError={referenceUploads.uploadError}
                  onReferenceUploadDismiss={referenceUploads.clearUploadError}
                  onReferenceFilesSelected={async (files) => {
                    const availableSlots = Math.max(0, 8 - customerReferences.length)
                    const nextFiles = files.slice(0, availableSlots)

                    if (nextFiles.length === 0) {
                      return
                    }

                    const uploadedReferences =
                      await referenceUploads.uploadFiles(nextFiles)

                    setCustomerReferences((current) => [
                      ...current,
                      ...uploadedReferences,
                    ])
                  }}
                />

                <div className="space-y-5">
                  <div className="glass-card rounded-2xl border border-indigo-500/20 p-6">
                    <div className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-200">
                      Native Feature
                    </div>
                    <h2 className="mt-4 text-2xl font-display font-bold">
                      Ready to pay
                    </h2>
                    <p className="mt-2 text-white/45">
                      Confirm payment once here. When your smooth action session
                      is active, repeat steps can feel nearly invisible while the
                      app keeps the commerce flow moving.
                    </p>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
                      <p className="font-semibold text-white">
                        {isSessionActive
                          ? "Smooth action session is active"
                          : "One approval unlocks smoother follow-up actions"}
                      </p>
                      <p className="mt-1">
                        {isSessionActive
                          ? "AgentCommerce can reuse your approved session for compatible follow-up actions, reducing extra wallet interruptions."
                          : "Approve once in simple language, then compatible repeat actions can happen with much less friction until the session ends."}
                      </p>
                    </div>

                    <div className="mt-6 space-y-3">
                      <WalletActionButton
                        className="w-full h-14 text-lg font-bold"
                        connectLabel="Connect Wallet to Pay"
                        disabled={!createOrder.canSubmit}
                        onAuthorizedAction={() =>
                          createOrder.submit({ customerNote, customerReferences })
                        }
                      >
                        Confirm Payment
                      </WalletActionButton>
                      {!createOrder.canSubmit ? (
                        <p className="text-sm text-amber-200">
                          {!createOrder.wallet.isConfigured
                            ? createOrder.wallet.networkMessage.description
                            : "This service is missing the on-chain checkout metadata needed to call ServiceEscrow."}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-sm text-white/55">
                    <p className="font-semibold text-white">
                      Smooth consumer UX
                    </p>
                    <p className="mt-2">
                      AgentCommerce prepares the order, opens the wallet only when
                      needed, sends the escrow payment on your local Initia rollup,
                      and then refreshes the order state so the chain details stay
                      mostly in the background.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
