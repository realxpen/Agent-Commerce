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
import {
  getServiceDeliverableDefinition,
  getServiceComingSoonDeliverableDefinitions,
  getServiceCreationDeliverableDefinitions,
  type ServiceDeliverableType,
} from "@/lib/services/deliverable-profile"
import {
  getServiceExecutionModeDefinition,
  getSupportedCreationExecutionModeDefinitions,
  getSupportedCreationExecutionModes,
  type ServiceExecutionMode,
} from "@/lib/services/execution-mode"

type ServicePreset = {
  id: string
  title: string
  description: string
  priceAmount: string
  estimatedDeliveryMinutes: string
  executionMode: ServiceExecutionMode
  deliverableType: ServiceDeliverableType
  spotlight: string
  expectedOutput: string
}

const serviceTestPresets: readonly ServicePreset[] = [
  {
    id: "structured-export",
    title: "Structured Analytics Export",
    description:
      "Upload CSV, JSON, notes, or transcripts and receive a normalized analytics pack with computed findings, a briefing document, and export-ready files.",
    priceAmount: "35",
    estimatedDeliveryMinutes: "90",
    executionMode: "file_generation",
    deliverableType: "data",
    spotlight: "Best for the guarded code runner and file artifacts.",
    expectedOutput: "JSON export, markdown briefing, and computed analysis files.",
  },
  {
    id: "competitor-brief",
    title: "Competitor Research Brief",
    description:
      "Research the referenced competitors, compare their messaging and positioning, and produce a concise brief with grounded findings and source-backed recommendations.",
    priceAmount: "30",
    estimatedDeliveryMinutes: "90",
    executionMode: "research_with_links",
    deliverableType: "document",
    spotlight: "Best for source-backed research output and clean document delivery.",
    expectedOutput: "Research brief with structured findings, links, and market gaps.",
  },
  {
    id: "visual-draft-kit",
    title: "Visual Campaign Draft Kit",
    description:
      "Turn a brief plus reference images into polished draft visuals for ads, thumbnails, posters, or hero artwork, then review the draft before delivery.",
    priceAmount: "45",
    estimatedDeliveryMinutes: "120",
    executionMode: "hybrid_ai_plus_owner_review",
    deliverableType: "design",
    spotlight: "Best for image generation with owner review.",
    expectedOutput: "Generated image artifacts waiting in the owner review stage.",
  },
  {
    id: "staking-contract",
    title: "ERC20 Staking Contract Draft",
    description:
      "Draft a staking smart contract package with reward logic, security notes, and implementation-ready source material.",
    priceAmount: "80",
    estimatedDeliveryMinutes: "180",
    executionMode: "file_generation",
    deliverableType: "contract",
    spotlight: "Best for smart contract code previews and downloadable source.",
    expectedOutput: "Solidity or Rust-style contract source plus implementation notes.",
  },
  {
    id: "dashboard-starter",
    title: "React Dashboard Starter",
    description:
      "Build a starter dashboard package with typed components, clean sections, and code the owner can ship or extend.",
    priceAmount: "60",
    estimatedDeliveryMinutes: "120",
    executionMode: "file_generation",
    deliverableType: "code",
    spotlight: "Best for code package delivery and archive-style handoff.",
    expectedOutput: "TSX, TS, and structured code artifacts ready to download.",
  },
  {
    id: "tokenomics-sheet",
    title: "Tokenomics Spreadsheet Pack",
    description:
      "Turn uploaded metrics, assumptions, and planning notes into a spreadsheet-ready tokenomics or ROI pack with clean tabs and summary guidance.",
    priceAmount: "50",
    estimatedDeliveryMinutes: "120",
    executionMode: "file_generation",
    deliverableType: "spreadsheet",
    spotlight: "Best for workbook-style outputs and sheet-friendly exports.",
    expectedOutput: "Spreadsheet-oriented file pack with structured calculations and summary notes.",
  },
] as const

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

  const executionModeDefinition = useMemo(
    () => getServiceExecutionModeDefinition(formData.executionMode),
    [formData.executionMode],
  )
  const deliverableDefinition = useMemo(
    () => getServiceDeliverableDefinition(formData.deliverableType),
    [formData.deliverableType],
  )
  const creatableDeliverableDefinitions = useMemo(
    () => getServiceCreationDeliverableDefinitions(),
    [],
  )
  const comingSoonDeliverableDefinitions = useMemo(
    () => getServiceComingSoonDeliverableDefinitions(),
    [],
  )
  const supportedExecutionModeDefinitions = useMemo(
    () => getSupportedCreationExecutionModeDefinitions(formData.deliverableType),
    [formData.deliverableType],
  )

  const updateField = (field: keyof CreateServiceFormValues, value: string) => {
    setFormData((current) => {
      if (field === "deliverableType") {
        const nextDeliverableType = value as ServiceDeliverableType
        const supportedModes =
          getSupportedCreationExecutionModes(nextDeliverableType)

        return {
          ...current,
          deliverableType: nextDeliverableType,
          executionMode: supportedModes.includes(current.executionMode)
            ? current.executionMode
            : (supportedModes[0] ?? current.executionMode),
        }
      }

      return {
        ...current,
        [field]: value,
      }
    })
    createService.clearFieldError(field)

    if (field === "deliverableType") {
      createService.clearFieldError("executionMode")
    }
  }

  const applyPreset = (preset: ServicePreset) => {
    setFormData((current) => ({
      ...current,
      title: preset.title,
      description: preset.description,
      priceAmount: preset.priceAmount,
      estimatedDeliveryMinutes: preset.estimatedDeliveryMinutes,
      executionMode: preset.executionMode,
      deliverableType: preset.deliverableType,
    }))

    createService.clearFieldError("title")
    createService.clearFieldError("description")
    createService.clearFieldError("priceAmount")
    createService.clearFieldError("estimatedDeliveryMinutes")
    createService.clearFieldError("executionMode")
    createService.clearFieldError("deliverableType")
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
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Quick Test Presets</p>
                <p className="mt-1 text-sm text-white/45">
                  Load a ready-made AI-first service setup for the live deliverable flows.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {serviceTestPresets.map((preset) => {
                  const isSelected =
                    formData.title === preset.title &&
                    formData.executionMode === preset.executionMode &&
                    formData.deliverableType === preset.deliverableType
                  const presetDeliverableDefinition = getServiceDeliverableDefinition(
                    preset.deliverableType,
                  )

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">{preset.title}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-white/10 bg-black/20 text-white/70"
                          >
                            {
                              getServiceExecutionModeDefinition(preset.executionMode)
                                .shortLabel
                            }
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-white/10 bg-black/20 text-white/70"
                          >
                            {presetDeliverableDefinition.shortLabel}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-white/55">
                        {preset.spotlight}
                      </p>
                      <p className="mt-3 text-sm text-white/40">
                        {preset.expectedOutput}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

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

            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                AgentCommerce now creates the output itself for new services. Owners can review or publish AI output, but manual owner-created delivery is disabled for new listings.
              </div>

              <Label htmlFor="deliverableType">Expected Deliverable</Label>
              <select
                id="deliverableType"
                value={formData.deliverableType}
                onChange={(event) =>
                  updateField("deliverableType", event.target.value)
                }
                className="flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none"
              >
                {creatableDeliverableDefinitions.map((definition) => (
                  <option key={definition.value} value={definition.value}>
                    {definition.label}
                  </option>
                ))}
              </select>
              <FieldError field="deliverableType" errors={createService.fieldErrors} />
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                  What this service will hand off
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">
                    {deliverableDefinition.label}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-white/10 bg-black/20 text-white/70"
                  >
                    {deliverableDefinition.automationLabel}
                  </Badge>
                </div>
                <p className="mt-2">{deliverableDefinition.description}</p>
                <p className="mt-3 text-white/45">{deliverableDefinition.serviceHint}</p>
              </div>

              {comingSoonDeliverableDefinitions.length > 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                    Coming Soon Deliverables
                  </p>
                  <p className="mt-2">
                    These preview beautifully in the app already, but their end-to-end AI generation runners are not live yet, so they are not available for new services.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {comingSoonDeliverableDefinitions.map((definition) => (
                      <Badge
                        key={definition.value}
                        variant="outline"
                        className="border-white/10 bg-black/20 text-white/70"
                      >
                        {definition.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <Label htmlFor="executionMode">Fulfillment Mode</Label>
              <select
                id="executionMode"
                value={formData.executionMode}
                onChange={(event) => updateField("executionMode", event.target.value)}
                className="flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none"
                disabled={supportedExecutionModeDefinitions.length === 0}
              >
                {supportedExecutionModeDefinitions.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <FieldError field="executionMode" errors={createService.fieldErrors} />
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                  How this service will run
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">
                    {executionModeDefinition.label}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-white/10 bg-black/20 text-white/70"
                  >
                    {deliverableDefinition.label}
                  </Badge>
                </div>
                <p className="mt-2">{executionModeDefinition.description}</p>
                <p className="mt-3 text-white/45">
                  {deliverableDefinition.automationLevel === "ai_ready"
                    ? "This deliverable type is already the strongest fit for live AI generation in AgentCommerce."
                    : deliverableDefinition.automationLevel === "owner_review"
                      ? "This deliverable type works best when AI drafts first and the owner signs off before the customer sees it."
                      : "This deliverable type is preview-ready in the app, but it is not available for new AI-first services yet."}
                </p>
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
            <div>
              <p className="font-semibold text-white">4. Let AI fulfill the work</p>
              <p>New services are AI-first. Owners review or publish drafts, but they do not create the deliverable manually.</p>
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
