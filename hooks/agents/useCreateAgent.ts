"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "@/components/providers/SessionProvider"
import { useBackendAuth } from "@/hooks/auth"
import {
  AgentCommerceApiError,
  agentCommerceApi,
  getApiErrorMessage,
} from "@/lib/api/client"
import type { AgentDto } from "@/lib/api/types"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { useContractAction } from "@/hooks/contracts/useContractAction"
import { createAgent as createAgentOnChain } from "@/lib/contracts/agent-registry-client"
import { buildTransactionState } from "@/lib/transactions/messages"
import type {
  CreateAgentFieldErrors,
  CreateAgentFormValues,
} from "@/lib/agents/create-agent-form"
import { validateCreateAgentForm } from "@/lib/agents/create-agent-form"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { agentCommerceConfig } from "@/lib/appchain/config"

export type CreateAgentFlowStage =
  | "idle"
  | "saving_metadata"
  | "awaiting_wallet"
  | "confirming"
  | "syncing_backend"
  | "success"
  | "error"

export type CreateAgentSyncStatus =
  | "skipped"
  | "draft_saved"
  | "published"
  | "failed"

export type CreateAgentSuccess = {
  backendAgent: AgentDto | null
  backendSyncStatus: CreateAgentSyncStatus
  contractAddress: `0x${string}`
  onChainAgentId: bigint | null
  txHash: `0x${string}`
  warningMessage: string | null
}

export type UseCreateAgentOptions = {
  backendSyncMode?: "optional" | "required" | "skip"
}

function getCreateAgentTransactionState(options: {
  stage: CreateAgentFlowStage
  txHash: `0x${string}` | null
  errorMessage: string | null
  canRetry: boolean
}) {
  switch (options.stage) {
    case "saving_metadata":
      return buildTransactionState({
        status: "preparing",
        txHash: options.txHash,
        message: {
          title: "Saving agent metadata",
          description:
            "AgentCommerce is creating the draft agent record before sending the on-chain deployment.",
        },
        canRetry: false,
      })
    case "awaiting_wallet":
      return buildTransactionState({
        status: options.txHash ? "submitting" : "awaiting_wallet",
        txHash: options.txHash,
        message: {
          title: options.txHash
            ? "Submitting agent deployment"
            : "Approve agent deployment",
          description: options.txHash
            ? "Your wallet approved the request and the deployment is being sent to the appchain."
            : "Approve the AgentRegistry transaction in your wallet to deploy this agent on-chain.",
        },
        canRetry: false,
      })
    case "confirming":
      return buildTransactionState({
        status: "pending",
        txHash: options.txHash,
        message: {
          title: "Confirming on-chain deployment",
          description:
            "The deployment transaction is on-chain now. AgentCommerce is waiting for confirmation before refreshing your dashboard.",
        },
        canRetry: false,
      })
    case "syncing_backend":
      return buildTransactionState({
        status: "confirmed",
        txHash: options.txHash,
        message: {
          title: "Refreshing your agent profile",
          description:
            "The deployment is confirmed. AgentCommerce is syncing the created agent back into the dashboard now.",
        },
        canRetry: false,
      })
    case "success":
      return buildTransactionState({
        status: "confirmed",
        txHash: options.txHash,
        message: {
          title: "Agent created successfully",
          description:
            "Your agent is now registered on the appchain and ready for service configuration.",
        },
        canRetry: false,
      })
    case "error":
      return buildTransactionState({
        status: "failed",
        txHash: options.txHash,
        errorMessage: options.errorMessage,
        message: {
          title: "Agent deployment needs attention",
          description:
            "The deployment flow stopped before it completed. Review the details and try again when ready.",
        },
        canRetry: options.canRetry,
        retryLabel: "Try deployment again",
      })
    case "idle":
    default:
      return buildTransactionState({
        status: "idle",
        txHash: options.txHash,
        message: {
          title: "Ready to deploy",
          description:
            "Review the agent details, then send the AgentRegistry transaction when you are ready.",
        },
        canRetry: false,
      })
  }
}

function getWalletSubmissionError(options: {
  isConfigured: boolean
  isConnected: boolean
  isOnExpectedAppchain: boolean
  networkDescription: string
}) {
  if (!options.isConfigured) {
    return options.networkDescription
  }

  if (!options.isConnected) {
    return "Connect your wallet before deploying an agent."
  }

  if (!options.isOnExpectedAppchain) {
    return options.networkDescription
  }

  return null
}

export function useCreateAgent(options: UseCreateAgentOptions = {}) {
  const backendSyncMode = options.backendSyncMode ?? "optional"
  const router = useRouter()
  const queryClient = useQueryClient()
  const session = useSession()
  const auth = useBackendAuth()
  const wallet = useWalletConnectionFlow()
  const contractAction = useContractAction(createAgentOnChain)
  const lastSubmittedValuesRef = useRef<CreateAgentFormValues | null>(null)

  const [manualStage, setManualStage] = useState<
    Exclude<CreateAgentFlowStage, "awaiting_wallet" | "confirming">
  >("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CreateAgentFieldErrors>({})
  const [createdAgent, setCreatedAgent] = useState<CreateAgentSuccess | null>(null)

  const stage = useMemo<CreateAgentFlowStage>(() => {
    if (contractAction.isSubmitting) {
      return "awaiting_wallet"
    }

    if (contractAction.isConfirming) {
      return "confirming"
    }

    return manualStage
  }, [contractAction.isConfirming, contractAction.isSubmitting, manualStage])

  const transaction = useMemo(
    () =>
      getCreateAgentTransactionState({
        stage,
        txHash: createdAgent?.txHash ?? contractAction.txHash,
        errorMessage,
        canRetry: lastSubmittedValuesRef.current !== null,
      }),
    [contractAction.txHash, createdAgent?.txHash, errorMessage, stage],
  )

  const clearFieldError = useCallback(
    (field: keyof CreateAgentFieldErrors) => {
      setFieldErrors((current) => {
        if (!current[field]) {
          return current
        }

        const next = { ...current }
        delete next[field]
        return next
      })
    },
    [],
  )

  const applyFieldErrors = useCallback((errors: CreateAgentFieldErrors) => {
    setFieldErrors(errors)
  }, [])

  const reset = useCallback(() => {
    contractAction.reset()
    setManualStage("idle")
    setErrorMessage(null)
    setWarningMessage(null)
    setFieldErrors({})
    setCreatedAgent(null)
  }, [contractAction])

  const submit = useCallback(
    async (values: CreateAgentFormValues) => {
      contractAction.reset()
      setManualStage("idle")
      setErrorMessage(null)
      setWarningMessage(null)
      setFieldErrors({})
      setCreatedAgent(null)

      const validation = validateCreateAgentForm(values, {
        walletTreasuryAddress: wallet.hexAddress,
      })

      if (!validation.success) {
        setFieldErrors(validation.errors)
        setErrorMessage("Fix the highlighted fields before deploying your agent.")
        setManualStage("error")
        return null
      }

      lastSubmittedValuesRef.current = values

      const walletError = getWalletSubmissionError({
        isConfigured: wallet.isConfigured,
        isConnected: wallet.isConnected,
        isOnExpectedAppchain: wallet.isOnExpectedAppchain,
        networkDescription: wallet.networkMessage.description,
      })

      if (walletError) {
        setErrorMessage(walletError)
        setManualStage("error")
        return null
      }

      let backendAgent: AgentDto | null = null
      let backendSyncStatus: CreateAgentSyncStatus = "skipped"
      let nextWarning: string | null = null

      if (backendSyncMode !== "skip") {
        setManualStage("saving_metadata")

        const authSession = await auth.ensureAuthenticated()

        if (!authSession) {
          if (backendSyncMode === "required") {
            setErrorMessage(
              auth.errorMessage ??
                "Wallet sign-in is required before AgentCommerce can save agent metadata.",
            )
            setManualStage("error")
            return null
          }
          nextWarning =
            auth.errorMessage ??
            "On-chain deployment can continue, but backend metadata sync is still waiting for wallet sign-in."
        } else {
          try {
            const response = await agentCommerceApi.createAgentMetadata({
              name: validation.data.name,
              category: validation.data.category,
              description: validation.data.description,
              pricingModel: validation.data.pricingModel,
              treasuryAddress: validation.data.treasuryAddress,
              initUsername: validation.data.initUsername,
              appchainId: agentCommerceConfig.appchain.interwovenChainId,
              metadata: {
                setup: {
                  suggestedDefaultPrice: validation.data.defaultPrice,
                },
              },
            })

            backendAgent = response.data
            backendSyncStatus = "draft_saved"
          } catch (error) {
            const message = getApiErrorMessage(error)

            if (backendSyncMode === "required") {
              setErrorMessage(message)
              setManualStage("error")
              return null
            }

            if (error instanceof AgentCommerceApiError && error.status === 401) {
              nextWarning =
                "On-chain deployment can continue, but backend metadata sync is waiting for wallet auth."
            } else {
              nextWarning = message
            }
          }
        }
      }

      const contractResult = await contractAction.execute({
        name: validation.data.name,
        category: validation.data.category,
        description: validation.data.description,
        treasuryAddress: validation.data.treasuryAddress,
        initUsername: validation.data.initUsername,
      })

      if (!contractResult.success) {
        const message =
          backendAgent !== null
            ? `${contractResult.error.message} Your draft agent metadata was saved and can be retried later.`
            : contractResult.error.message

        setErrorMessage(message)
        setWarningMessage(nextWarning)
        setManualStage("error")
        return null
      }

      if (backendAgent) {
        setManualStage("syncing_backend")

        try {
          const updatedResponse = await agentCommerceApi.updateAgent(backendAgent.id, {
            appchainId: agentCommerceConfig.appchain.interwovenChainId,
            contractAddress: contractResult.data.contractAddress,
            metadata: {
              ...(backendAgent.metadata &&
              typeof backendAgent.metadata === "object" &&
              !Array.isArray(backendAgent.metadata)
                ? backendAgent.metadata
                : {}),
              onchain: {
                agentId: contractResult.data.agentId?.toString() ?? null,
                contractAddress: contractResult.data.contractAddress,
                chainId: agentCommerceConfig.appchain.interwovenChainId,
              },
              setup: {
                suggestedDefaultPrice: validation.data.defaultPrice,
              },
            },
          })
          backendAgent = updatedResponse.data

          const publishResponse = await agentCommerceApi.publishAgent(backendAgent.id)
          backendAgent = publishResponse.data
          backendSyncStatus = "published"
        } catch (error) {
          backendSyncStatus = "failed"
          nextWarning =
            nextWarning ??
            `${getApiErrorMessage(error)} Your on-chain agent was created, but the dashboard record still needs publishing.`
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ["api", "agents"],
      })

      if (backendAgent) {
        queryClient.setQueryData(apiQueryKeys.agent(backendAgent.id), {
          data: backendAgent,
        })
      }

      router.refresh()

      const successResult: CreateAgentSuccess = {
        backendAgent,
        backendSyncStatus,
        contractAddress: contractResult.data.contractAddress,
        onChainAgentId: contractResult.data.agentId,
        txHash: contractResult.txHash,
        warningMessage: nextWarning,
      }

      session.markSessionUsed("create_agent")
      setCreatedAgent(successResult)
      setWarningMessage(nextWarning)
      setManualStage("success")

      return successResult
    },
    [
      backendSyncMode,
      contractAction,
      queryClient,
      router,
      session,
      auth,
      auth.errorMessage,
      wallet.hexAddress,
      wallet.isConfigured,
      wallet.isConnected,
      wallet.isOnExpectedAppchain,
      wallet.networkMessage.description,
    ],
  )

  const retry = useCallback(async () => {
    if (!lastSubmittedValuesRef.current) {
      return null
    }

    return submit(lastSubmittedValuesRef.current)
  }, [submit])

  return {
    submit,
    retry,
    reset,
    clearFieldError,
    applyFieldErrors,
    fieldErrors,
    createdAgent,
    errorMessage,
    warningMessage,
    stage,
    transaction,
    txHash: transaction.txHash,
    isWorking:
      stage === "saving_metadata" ||
      stage === "awaiting_wallet" ||
      stage === "confirming" ||
      stage === "syncing_backend",
    isSuccess: stage === "success",
    isError: stage === "error",
    canRetry: transaction.canRetry,
    wallet,
  }
}
