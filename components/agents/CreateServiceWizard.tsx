"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  CheckCircle2,
  ChevronRight,
  Layers3,
  Sparkles,
  Wallet,
} from "lucide-react"
import { WalletActionButton } from "@/components/guards"
import { NativeFeaturePill } from "@/components/session"
import { StatusNoticeCard } from "@/components/states"
import { TransactionStatusPanel } from "@/components/transactions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton"
import { WalletStatusBadge } from "@/components/wallet/WalletStatusBadge"
import { useCreateService } from "@/hooks/agents"
import { getAgentOnchainReferences } from "@/lib/agents/onchain"
import type {
  CreateServiceFieldErrors,
  CreateServiceFormValues,
} from "@/lib/agents/create-service-form"

function parseBigIntCandidate(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return BigInt(value)
  } catch {
    return null
  }
}

function FieldError({
  field,
  errors,
}: {
  field: keyof CreateServiceFormValues
  errors: CreateServiceFieldErrors
}) {
  if (!errors[field]) {
    return null
  }

  return <p className="text-xs text-rose-300">{errors[field]}</p>
}

export function CreateServiceWizard() {
  const searchParams = useSearchParams()
  const preferredAgentId = searchParams.get("agentId") ?? undefined
  const fallbackOnchainAgentId = parseBigIntCandidate(
    searchParams.get("onchainAgentId"),
  )
  const createService = useCreateService({
    preferredAgentId,
    fallbackOnchainAgentId,
  })
  const [formData, setFormData] = useState<CreateServiceFormValues>(
    createService.initialValues,
  )

  const selectedAgent = createService.getAgentById(formData.agentId)
  const selectedAgentRefs = selectedAgent
    ? getAgentOnchainReferences(selectedAgent)
    : null
  const resolvedOnchainAgentId =
    selectedAgentRefs?.onchainAgentId ??
    (selectedAgent?.id === preferredAgentId ? fallbackOnchainAgentId : null)

  const helperMessage = useMemo(() => {
    if (createService.stage === "awaiting_wallet") {
      return "One wallet approval lists the service on-chain, then AgentCommerce handles the customer-facing publish step."
    }

    if (createService.stage === "syncing_backend") {
      return "The listing is confirmed on-chain. AgentCommerce is attaching the checkout metadata and making the service visible now."
    }

    return createService.warningMessage ?? null
  }, [createService.stage, createService.warningMessage])

  const updateField = (field: keyof CreateServiceFormValues, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
    createService.clearFieldError(field)
  }

  if (createService.isSuccess && createService.createdService) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card className="glass-card border-emerald-500/20 text-center">
          <CardContent className="space-y-6 py-12">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
              <CheckCircle2 className="size-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-bold">Service Published</h2>
              <p className="text-white/50">
                {createService.createdService.backendService?.title ?? formData.title} is now ready for checkout in AgentCommerce.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Agent
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {createService.createdService.backendAgent.name}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    On-Chain Service ID
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {createService.createdService.onChainServiceId?.toString() ??
                      "Pending sync"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Transaction Hash
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-white/60">
                    {createService.createdService.txHash}
                  </p>
                </div>
              </div>
            </div>

            {createService.warningMessage ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-200">
                {createService.warningMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <Link
                href={`/agent/${createService.createdService.backendAgent.id}`}
                className="block"
              >
                <Button className="w-full">View Agent Profile</Button>
              </Link>
              <Button
                variant="outline"
                className="w-full border-white/10 bg-white/5"
                onClick={() => {
                  createService.reset()
                  setFormData({
                    ...createService.initialValues,
                    agentId: createService.createdService?.backendAgent.id ?? "",
                  })
                }}
              >
                Create Another Service
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (createService.isWorking) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <TransactionStatusPanel
          transaction={createService.transaction}
          warningMessage={createService.warningMessage}
          helperMessage={helperMessage}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      <div className="space-y-4 text-center">
        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
          <Sparkles className="mr-1 size-3" />
          Create Service
        </Badge>
        <h1 className="text-4xl font-display font-bold">
          Publish a Checkout-Ready Service
        </h1>
        <p className="mx-auto max-w-2xl text-white/45">
          Save the backend listing, register the service on-chain, and publish the customer-facing checkout metadata from one flow.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <NativeFeaturePill surface="dashboard" />
          <ConnectWalletButton showStatusBadge />
          <Badge variant="outline" className="border-white/10 bg-white/5">
            {createService.wallet.expectedNetworkLabel}
          </Badge>
        </div>
      </div>

      {!createService.wallet.isConnected || !createService.wallet.isOnExpectedAppchain ? (
        <StatusNoticeCard
          tone="warning"
          title={createService.wallet.walletStatusTitle}
          description={createService.wallet.networkMessage.description}
        />
      ) : null}

      {!createService.auth.isAuthenticated ? (
        <StatusNoticeCard
          tone="warning"
          title="Unlock backend sync before publishing"
          description="Service drafts and profile publishing are tied to your wallet-backed backend session. Sign one message to continue."
          actionLabel={createService.auth.isSigningIn ? "Unlocking..." : "Unlock Backend Sync"}
          onAction={
            createService.auth.isSigningIn
              ? undefined
              : () => void createService.auth.signIn()
          }
        />
      ) : null}

      {createService.errorMessage ? (
        <StatusNoticeCard
          tone="danger"
          title="Service publishing needs attention"
          description={createService.errorMessage}
          actionLabel={createService.canRetry ? "Retry service flow" : undefined}
          onAction={
            createService.canRetry
              ? () => createService.retry().then(() => undefined)
              : undefined
          }
        />
      ) : null}

      {createService.warningMessage ? (
        <StatusNoticeCard
          tone="warning"
          title="Sync note"
          description={createService.warningMessage}
        />
      ) : null}

      {createService.auth.isAuthenticated &&
      !createService.ownedAgentsQuery.isLoading &&
      createService.availableAgents.length === 0 ? (
        <StatusNoticeCard
          tone="warning"
          title="Create an agent first"
          description="Your backend workspace does not have a synced agent yet. Create an agent before publishing services."
          actionLabel="Create Agent"
          onAction={() => {
            window.location.href = "/dashboard/create"
          }}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Layers3 className="size-6 text-emerald-400" />
              Service Details
            </CardTitle>
            <CardDescription className="text-white/45">
              Keep the service title clear, the description crisp, and the payout price aligned with the native appchain token.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="agentId">Agent</Label>
              <select
                id="agentId"
                value={formData.agentId}
                onChange={(event) => updateField("agentId", event.target.value)}
                className="flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none"
                disabled={!createService.auth.isAuthenticated}
              >
                <option value="">Select an agent</option>
                {createService.availableAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <FieldError field="agentId" errors={createService.fieldErrors} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Service Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="SEO Article Package"
                className="border-white/10 bg-black/40"
              />
              <FieldError field="title" errors={createService.fieldErrors} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">What the customer receives</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Describe the output, turnaround, and what makes this service trustworthy."
                className="min-h-32 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/25"
              />
              <FieldError field="description" errors={createService.fieldErrors} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priceAmount">Price</Label>
                <Input
                  id="priceAmount"
                  value={formData.priceAmount}
                  onChange={(event) => updateField("priceAmount", event.target.value)}
                  placeholder="25"
                  className="border-white/10 bg-black/40"
                />
                <FieldError field="priceAmount" errors={createService.fieldErrors} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedDeliveryMinutes">Estimated Delivery (minutes)</Label>
                <Input
                  id="estimatedDeliveryMinutes"
                  value={formData.estimatedDeliveryMinutes}
                  onChange={(event) =>
                    updateField("estimatedDeliveryMinutes", event.target.value)
                  }
                  placeholder="60"
                  className="border-white/10 bg-black/40"
                />
                <FieldError
                  field="estimatedDeliveryMinutes"
                  errors={createService.fieldErrors}
                />
              </div>
            </div>

            {selectedAgent ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{selectedAgent.name}</p>
                    <p className="text-sm text-white/45">
                      Treasury routes to {selectedAgent.treasuryAddress}
                    </p>
                  </div>
                  <WalletStatusBadge />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                      Agent Status
                    </p>
                    <p className="mt-1 text-sm">{selectedAgent.status}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                      On-Chain Agent ID
                    </p>
                    <p className="mt-1 text-sm">
                      {resolvedOnchainAgentId?.toString() ?? "Still syncing"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedAgent && resolvedOnchainAgentId === null ? (
              <StatusNoticeCard
                tone="warning"
                title="This agent still needs its on-chain ID synced"
                description="Create-agent finished, but the backend record has not picked up the on-chain agent reference yet. Refresh the dashboard or re-open the just-created agent flow before publishing services."
              />
            ) : null}
          </CardContent>

          <CardFooter className="flex justify-between border-t border-white/5 bg-white/[0.02]">
            <Link href="/dashboard">
              <Button variant="ghost">Back to Dashboard</Button>
            </Link>
            <WalletActionButton
              connectLabel="Connect Wallet to Publish Service"
              onAuthorizedAction={() => createService.submit(formData)}
            >
              Publish Service
              <ChevronRight className="ml-2 size-4" />
            </WalletActionButton>
          </CardFooter>
        </Card>

        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="text-lg">Flow Summary</CardTitle>
            <CardDescription className="text-white/45">
              This keeps the service flow checkout-ready without making the chain feel heavy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/55">
            <div>
              <p className="font-semibold text-white">1. Save a draft listing</p>
              <p>The backend stores the customer-facing service metadata under your wallet-backed workspace.</p>
            </div>
            <div>
              <p className="font-semibold text-white">2. Register the service on-chain</p>
              <p>The AgentRegistry transaction creates the verifiable service listing and price reference.</p>
            </div>
            <div>
              <p className="font-semibold text-white">3. Publish checkout metadata</p>
              <p>AgentCommerce attaches the on-chain IDs and payable amount so the checkout flow can stay smooth.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <Wallet className="size-4 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">Native token pricing</p>
                  <p className="mt-1 text-sm text-white/45">
                    Prices are converted into {createService.wallet.expectedNetworkLabel} base units behind the scenes for the payable contract call.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
