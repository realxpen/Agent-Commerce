"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Wallet,
  Zap,
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
import { useSession } from "@/components/providers/SessionProvider"
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton"
import { WalletStatusBadge } from "@/components/wallet/WalletStatusBadge"
import { useCreateAgent } from "@/hooks/agents"
import {
  createAgentCategories,
  initialCreateAgentFormValues,
  validateCreateAgentStep,
  type CreateAgentFieldErrors,
  type CreateAgentFormValues,
} from "@/lib/agents/create-agent-form"
import { cn } from "@/lib/utils"

const steps = [
  "Identity",
  "Category",
  "Pricing",
  "Treasury",
  "Deploy",
] as const

type WizardField = keyof CreateAgentFormValues

function FieldError({
  field,
  errors,
}: {
  field: WizardField
  errors: CreateAgentFieldErrors
}) {
  if (!errors[field]) {
    return null
  }

  return <p className="text-xs text-rose-300">{errors[field]}</p>
}

export function CreateAgentWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(initialCreateAgentFormValues)
  const { isSessionActive } = useSession()
  const createAgent = useCreateAgent({
    backendSyncMode: "optional",
  })

  const connectedTreasuryAddress = createAgent.wallet.hexAddress ?? ""
  const displayedPayoutAddress =
    formData.payoutAddress || connectedTreasuryAddress || "Connect wallet"

  const progressText = useMemo(() => {
    switch (createAgent.stage) {
      case "saving_metadata":
        return "Saving agent metadata"
      case "awaiting_wallet":
        return "Waiting for wallet approval"
      case "confirming":
        return "Waiting for on-chain confirmation"
      case "syncing_backend":
        return "Publishing agent profile"
      default:
        return ""
    }
  }, [createAgent.stage, isSessionActive])

  const updateField = (field: WizardField, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
    createAgent.clearFieldError(field)
  }

  const nextStep = async () => {
    if (currentStep === steps.length - 1) {
      await createAgent.submit(formData)
      return
    }

    const stepValidation = validateCreateAgentStep(formData, currentStep, {
      walletTreasuryAddress: connectedTreasuryAddress,
    })

    if (!stepValidation.success) {
      createAgent.applyFieldErrors(stepValidation.errors)
      return
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const prevStep = () => {
    if (createAgent.isWorking) {
      return
    }

    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  if (createAgent.isSuccess && createAgent.createdAgent) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="glass-card border-emerald-500/20 text-center">
          <CardContent className="space-y-6 py-12">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
              <CheckCircle2 className="size-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-bold">Agent Created</h2>
              <p className="text-white/50">
                {formData.name} is now registered on the AgentCommerce appchain.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    On-Chain Agent ID
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {createAgent.createdAgent.onChainAgentId?.toString() ??
                      "Pending index sync"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Backend Sync
                  </p>
                  <p className="mt-1 text-sm text-white/80">
              {createAgent.createdAgent.backendSyncStatus}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Transaction Hash
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-white/60">
                    {createAgent.createdAgent.txHash}
                  </p>
                </div>
              </div>
            </div>

            {createAgent.warningMessage ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-200">
                {createAgent.warningMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              {createAgent.createdAgent.backendAgent ? (
                <>
                  <Link
                    href={`/dashboard/services/new?agentId=${createAgent.createdAgent.backendAgent.id}${
                      createAgent.createdAgent.onChainAgentId !== null
                        ? `&onchainAgentId=${createAgent.createdAgent.onChainAgentId.toString()}`
                        : ""
                    }`}
                    className="block"
                  >
                    <Button className="w-full">Create First Service</Button>
                  </Link>
                  <Link
                    href={`/agent/${createAgent.createdAgent.backendAgent.id}`}
                    className="block"
                  >
                    <Button
                      variant="outline"
                      className="w-full border-white/10 bg-white/5"
                    >
                      View Agent Profile
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/dashboard" className="block">
                  <Button className="w-full">Go to Dashboard</Button>
                </Link>
              )}
              <Link href="/marketplace" className="block">
                <Button variant="outline" className="w-full border-white/10 bg-white/5">
                  Browse Marketplace
                </Button>
              </Link>
              <Button variant="ghost" onClick={createAgent.reset}>
                Create another agent
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (createAgent.isWorking) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <TransactionStatusPanel
          transaction={createAgent.transaction}
          warningMessage={createAgent.warningMessage}
          helperMessage={progressText}
          isAutoSigning={false}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      <div className="space-y-4 text-center">
        <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
          <Zap className="mr-1 size-3" />
          Create Agent
        </Badge>
        <h1 className="text-4xl font-display font-bold">
          Deploy Your Autonomous Agent
        </h1>
        <p className="mx-auto max-w-2xl text-white/45">
          Save the agent profile, send the AgentRegistry transaction, and refresh
          the dashboard from one guided flow.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <NativeFeaturePill surface="create_agent" />
          <ConnectWalletButton showStatusBadge />
          <Badge variant="outline" className="border-white/10 bg-white/5">
            <Globe className="mr-1 size-3" />
            {createAgent.wallet.expectedNetworkLabel}
          </Badge>
        </div>
      </div>

      {!createAgent.wallet.isConnected || !createAgent.wallet.isOnExpectedAppchain ? (
        <StatusNoticeCard
          tone="warning"
          title={createAgent.wallet.walletStatusTitle}
          description={createAgent.wallet.networkMessage.description}
        />
      ) : null}

      {createAgent.errorMessage ? (
        <StatusNoticeCard
          tone="danger"
          title="Deployment needs attention"
          description={createAgent.errorMessage}
          actionLabel={createAgent.canRetry ? "Retry deployment" : undefined}
          onAction={createAgent.canRetry ? () => createAgent.retry().then(() => undefined) : null}
        />
      ) : null}

      {createAgent.warningMessage ? (
        <StatusNoticeCard
          tone="warning"
          title="Sync note"
          description={createAgent.warningMessage}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Bot className="size-6 text-indigo-400" />
              {steps[currentStep]}
            </CardTitle>
            <CardDescription className="text-white/45">
              Step {currentStep + 1} of {steps.length}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {currentStep === 0 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Agent name"
                    className="bg-black/40 border-white/10"
                  />
                  <FieldError field="name" errors={createAgent.fieldErrors} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Init Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(event) =>
                      updateField("username", event.target.value)
                    }
                    placeholder="copywriter_pro"
                    className="bg-black/40 border-white/10"
                  />
                  <FieldError field="username" errors={createAgent.fieldErrors} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(event) => updateField("bio", event.target.value)}
                    placeholder="Describe the work your agent is best at."
                    className="min-h-32 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/25"
                  />
                  <FieldError field="bio" errors={createAgent.fieldErrors} />
                </div>
              </>
            ) : null}

            {currentStep === 1 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {createAgentCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => updateField("category", category)}
                    className={cn(
                      "rounded-2xl border px-4 py-5 text-left transition",
                      formData.category === category
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20",
                    )}
                  >
                    <p className="font-semibold">{category}</p>
                    <p className="mt-1 text-sm text-white/45">
                      Optimize this agent for {category.toLowerCase()} work.
                    </p>
                  </button>
                ))}
                <FieldError field="category" errors={createAgent.fieldErrors} />
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="space-y-2">
                <Label htmlFor="price">Default Service Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.defaultPrice}
                  onChange={(event) =>
                    updateField("defaultPrice", event.target.value)
                  }
                  className="bg-black/40 border-white/10"
                />
                <FieldError
                  field="defaultPrice"
                  errors={createAgent.fieldErrors}
                />
                <p className="text-sm text-white/45">
                  This is a frontend/backend pricing hint for your first service.
                  The on-chain agent registration itself only stores identity and
                  treasury details.
                </p>
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="size-5 text-indigo-400" />
                    <div>
                      <p className="font-medium">Connected Wallet</p>
                      <p className="text-sm font-mono text-white/45">
                        {connectedTreasuryAddress || "No EVM wallet connected yet"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payout">Custom Treasury Address</Label>
                  <Input
                    id="payout"
                    value={formData.payoutAddress}
                    onChange={(event) =>
                      updateField("payoutAddress", event.target.value)
                    }
                    placeholder={connectedTreasuryAddress || "0x..."}
                    className="bg-black/40 border-white/10 font-mono"
                  />
                  <FieldError
                    field="payoutAddress"
                    errors={createAgent.fieldErrors}
                  />
                  <p className="text-sm text-white/45">
                    Leave this blank to reuse the connected wallet address.
                  </p>
                </div>
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-semibold">{formData.name}</p>
                      <p className="text-sm text-indigo-300">
                        {formData.username ? `@${formData.username}` : "No Init username set"}
                      </p>
                    </div>
                    <WalletStatusBadge />
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                        Category
                      </p>
                      <p className="mt-1 text-sm">{formData.category}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                        Treasury
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-white/60">
                        {displayedPayoutAddress}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-white/45">
                  AgentCommerce will save metadata when possible, submit the
                  AgentRegistry transaction, wait for confirmation, then refresh
                  your agent data.
                </p>
              </div>
            ) : null}
          </CardContent>

          <CardFooter className="flex justify-between border-t border-white/5 bg-white/[0.02]">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 size-4" />
              Back
            </Button>
            {currentStep === steps.length - 1 ? (
              <WalletActionButton
                connectLabel="Connect Wallet to Create Agent"
                onAuthorizedAction={() => nextStep()}
              >
                Create Agent On-Chain
              </WalletActionButton>
            ) : (
              <Button onClick={() => void nextStep()}>
                Continue
                <ChevronRight className="ml-2 size-4" />
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="text-lg">Flow Summary</CardTitle>
            <CardDescription className="text-white/45">
              The page stays thin while the hook handles validation, backend sync,
              and transaction progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/55">
            <div>
              <p className="font-semibold text-white">1. Validate input</p>
              <p>Wizard data is checked before any backend or chain action runs.</p>
            </div>
            <div>
              <p className="font-semibold text-white">2. Save metadata draft</p>
              <p>AgentCommerce signs you into the backend with your wallet, then saves the agent draft before deployment.</p>
            </div>
            <div>
              <p className="font-semibold text-white">3. Send contract transaction</p>
              <p>The AgentRegistry create call is submitted and tracked until confirmation.</p>
            </div>
            <div>
              <p className="font-semibold text-white">4. Refresh created agent</p>
              <p>Agent queries are invalidated so the dashboard can pull fresh data.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
