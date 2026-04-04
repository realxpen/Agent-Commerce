"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Lock } from "lucide-react"
import { useMemo, useState } from "react"
import { WalletActionButton } from "@/components/guards"
import { HeaderBackLink } from "@/components/layout/HeaderBackLink"
import { WalletSessionControls } from "@/components/layout/WalletSessionControls"
import { StatusNoticeCard } from "@/components/states"
import { Button } from "@/components/ui/button"
import { CheckoutSummary } from "@/components/orders/CheckoutSummary"
import { OrderSuccessConfirmation } from "@/components/orders/OrderSuccessConfirmation"
import { TransactionStatusCard } from "@/components/orders/TransactionStatusCard"
import { useSession } from "@/components/providers/SessionProvider"
import { SessionApprovalCard } from "@/components/session"
import { useService, useServices } from "@/hooks/api"
import { useCreateOrder, useOrderReferenceUploads } from "@/hooks/orders"
import type { OrderReference } from "@/lib/api/types"
import {
  hydrateCheckoutContextFromService,
  parseCheckoutContext,
} from "@/lib/orders/checkout"
import { buildCheckoutBriefCoachPlan } from "@/lib/orders/brief-coach"
import { buildSampleOrderBriefs } from "@/lib/orders/sample-order-briefs"
import {
  filterWorkingPresetServices,
  isWorkingServicePresetTitle,
} from "@/lib/services/presets"

export default function CheckoutPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { isSessionActive } = useSession()
  const [customerNote, setCustomerNote] = useState("")
  const [customerReferences, setCustomerReferences] = useState<OrderReference[]>([])

  const checkoutBase = parseCheckoutContext({
    serviceId: params.id,
    searchParams,
  })
  const serviceQuery = useService(params.id)
  const sameAgentServicesQuery = useServices(
    {
      agentId: serviceQuery.data?.data.agentId,
      status: "ACTIVE",
      page: 1,
      pageSize: 12,
    },
    {
      enabled: Boolean(serviceQuery.data?.data.agentId),
    },
  )
  const activeServicesQuery = useServices(
    {
      status: "ACTIVE",
      page: 1,
      pageSize: 24,
    },
    {
      enabled: true,
    },
  )
  const checkout = hydrateCheckoutContextFromService({
    checkout: checkoutBase,
    service: serviceQuery.data?.data,
  })
  const availableRecommendationServices = useMemo(() => {
    const merged = [
      ...(sameAgentServicesQuery.data?.data ?? []),
      ...(activeServicesQuery.data?.data ?? []),
    ]
    const deduped = new Map<string, (typeof merged)[number]>()

    for (const service of merged) {
      if (!deduped.has(service.id)) {
        deduped.set(service.id, service)
      }
    }

    return filterWorkingPresetServices(Array.from(deduped.values()))
  }, [activeServicesQuery.data?.data, sameAgentServicesQuery.data?.data])
  const sampleBriefs = useMemo(
    () =>
      buildSampleOrderBriefs({
        checkout,
        service: serviceQuery.data?.data,
      }),
    [checkout, serviceQuery.data?.data],
  )
  const briefCoachPlan = useMemo(
    () =>
      buildCheckoutBriefCoachPlan({
        serviceTitle: checkout.serviceTitle,
        serviceDescription: checkout.serviceDescription,
        service: serviceQuery.data?.data,
        customerNote,
        customerReferences,
        availableServices: availableRecommendationServices,
      }),
    [
      availableRecommendationServices,
      checkout.serviceDescription,
      checkout.serviceTitle,
      customerNote,
      customerReferences,
      serviceQuery.data?.data,
    ],
  )
  const createOrder = useCreateOrder(checkout)
  const referenceUploads = useOrderReferenceUploads()

  const backHref = checkout.agentSlug
    ? `/agent/${checkout.backendAgentId}`
    : "/marketplace"

  if (
    serviceQuery.data?.data &&
    !isWorkingServicePresetTitle(serviceQuery.data.data.title)
  ) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <HeaderBackLink href={backHref} label="Back" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              <Lock className="w-3 h-3" />
              <span>Listing retired</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 pt-32">
          <div className="w-full max-w-2xl">
            <StatusNoticeCard
              tone="warning"
              title="This service is no longer checkout-ready"
              description="Older non-working services have been retired from AgentCommerce. Only the verified working preset services can be ordered now."
              actionLabel="Back to Marketplace"
              onAction={() => {
                window.location.href = "/marketplace"
              }}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <HeaderBackLink href={backHref} label="Back to Agent" />
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/10 bg-white/5">
                Dashboard
              </Button>
            </Link>
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
                  service={serviceQuery.data?.data}
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
                  sampleBriefs={sampleBriefs}
                  onApplySampleBrief={setCustomerNote}
                  availableServices={availableRecommendationServices}
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
                        disabled={
                          !createOrder.canSubmit ||
                          serviceQuery.isLoading ||
                          !briefCoachPlan.isCheckoutReady
                        }
                        onAuthorizedAction={() =>
                          createOrder.submit({ customerNote, customerReferences })
                        }
                      >
                        Confirm Payment
                      </WalletActionButton>
                      {!createOrder.canSubmit || !briefCoachPlan.isCheckoutReady ? (
                        <p className="text-sm text-amber-200">
                          {!createOrder.wallet.isConfigured
                            ? createOrder.wallet.networkMessage.description
                            : serviceQuery.isLoading
                              ? "AgentCommerce is loading the live checkout metadata for this service."
                              : !createOrder.canSubmit
                                ? "This service is missing the on-chain checkout metadata needed to call ServiceEscrow."
                                : briefCoachPlan.blockingMessage}
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
