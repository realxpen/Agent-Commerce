"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "@/components/providers/SessionProvider"
import { useBackendAuth } from "@/hooks/auth"
import { useAgents } from "@/hooks/api"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { useContractAction } from "@/hooks/contracts/useContractAction"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import {
  AgentCommerceApiError,
  agentCommerceApi,
  getApiErrorMessage,
} from "@/lib/api"
import type { AgentDto, AgentServiceDto } from "@/lib/api/types"
import {
  initialCreateServiceFormValues,
  type CreateServiceFieldErrors,
  type CreateServiceFormValues,
  validateCreateServiceForm,
} from "@/lib/agents/create-service-form"
import { getAgentOnchainReferences } from "@/lib/agents/onchain"
import { agentCommerceConfig } from "@/lib/appchain/config"
import { createService as createServiceOnChain } from "@/lib/contracts/agent-registry-client"
import { getServiceDeliverableDefinition } from "@/lib/services/deliverable-profile"
import { buildServiceFulfillmentMetadata } from "@/lib/services/execution-mode"
import { buildTransactionState } from "@/lib/transactions/messages"

export type CreateServiceFlowStage =
  | "idle"
  | "saving_metadata"
  | "awaiting_wallet"
  | "confirming"
  | "syncing_backend"
  | "success"
  | "error"

export type CreateServiceSuccess = {
  backendService: AgentServiceDto | null
  backendAgent: AgentDto
  txHash: `0x${string}`
  onChainServiceId: bigint | null
  warningMessage: string | null
}

export type UseCreateServiceOptions = {
  preferredAgentId?: string
  fallbackOnchainAgentId?: bigint | null
}

function getCreateServiceTransactionState(options: {
  stage: CreateServiceFlowStage
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
          title: "Saving service draft",
          description:
            "AgentCommerce is creating the backend service draft before sending the on-chain listing transaction.",
        },
        canRetry: false,
      })
    case "awaiting_wallet":
      return buildTransactionState({
        status: options.txHash ? "submitting" : "awaiting_wallet",
        txHash: options.txHash,
        message: {
          title: options.txHash
            ? "Submitting service listing"
            : "Approve service listing",
          description: options.txHash
            ? "Your wallet approved the service transaction and it is being sent to the appchain now."
            : "Approve the AgentRegistry transaction in your wallet to make this service available on-chain.",
        },
        canRetry: false,
      })
    case "confirming":
      return buildTransactionState({
        status: "pending",
        txHash: options.txHash,
        message: {
          title: "Confirming service on-chain",
          description:
            "The service transaction is on-chain now. AgentCommerce is waiting for confirmation before publishing the listing.",
        },
        canRetry: false,
      })
    case "syncing_backend":
      return buildTransactionState({
        status: "confirmed",
        txHash: options.txHash,
        message: {
          title: "Publishing the service",
          description:
            "The on-chain listing is confirmed. AgentCommerce is attaching the final metadata and publishing the service to the profile now.",
        },
        canRetry: false,
      })
    case "success":
      return buildTransactionState({
        status: "confirmed",
        txHash: options.txHash,
        message: {
          title: "Service is live",
          description:
            "Your service is now available for customers in the AgentCommerce flow.",
        },
        canRetry: false,
      })
    case "error":
      return buildTransactionState({
        status: "failed",
        txHash: options.txHash,
        errorMessage: options.errorMessage,
        message: {
          title: "Service publishing needs attention",
          description:
            "The service flow stopped before it completed. Review the details below and try again when ready.",
        },
        canRetry: options.canRetry,
        retryLabel: "Try service flow again",
      })
    case "idle":
    default:
      return buildTransactionState({
        status: "idle",
        txHash: options.txHash,
        message: {
          title: "Ready to create a service",
          description:
            "Save the service draft, send the on-chain listing, and publish the customer-facing entry in one flow.",
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
    return "Connect your wallet before publishing a service."
  }

  if (!options.isOnExpectedAppchain) {
    return options.networkDescription
  }

  return null
}

export function useCreateService(options: UseCreateServiceOptions = {}) {
  const queryClient = useQueryClient()
  const session = useSession()
  const auth = useBackendAuth()
  const wallet = useWalletConnectionFlow()
  const contractAction = useContractAction(createServiceOnChain, {
    autoSignMode: "disabled",
  })
  const lastSubmittedValuesRef = useRef<CreateServiceFormValues | null>(null)

  const [manualStage, setManualStage] = useState<
    Exclude<CreateServiceFlowStage, "awaiting_wallet" | "confirming">
  >("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CreateServiceFieldErrors>({})
  const [createdService, setCreatedService] =
    useState<CreateServiceSuccess | null>(null)

  const ownedAgentsQuery = useAgents(
    {
      ownerId: auth.session?.user.id,
      page: 1,
      pageSize: 50,
    },
    {
      enabled: auth.isAuthenticated,
    },
  )

  const availableAgents = ownedAgentsQuery.data?.data ?? []

  const stage = useMemo<CreateServiceFlowStage>(() => {
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
      getCreateServiceTransactionState({
        stage,
        txHash: createdService?.txHash ?? contractAction.txHash,
        errorMessage,
        canRetry: lastSubmittedValuesRef.current !== null,
      }),
    [contractAction.txHash, createdService?.txHash, errorMessage, stage],
  )

  const getAgentById = useCallback(
    (agentId: string) =>
      availableAgents.find((agent) => agent.id === agentId) ?? null,
    [availableAgents],
  )

  const clearFieldError = useCallback(
    (field: keyof CreateServiceFieldErrors) => {
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

  const applyFieldErrors = useCallback((errors: CreateServiceFieldErrors) => {
    setFieldErrors(errors)
  }, [])

  const reset = useCallback(() => {
    contractAction.reset()
    setManualStage("idle")
    setErrorMessage(null)
    setWarningMessage(null)
    setFieldErrors({})
    setCreatedService(null)
  }, [contractAction])

  const submit = useCallback(
    async (values: CreateServiceFormValues) => {
      contractAction.reset()
      setManualStage("idle")
      setErrorMessage(null)
      setWarningMessage(null)
      setFieldErrors({})
      setCreatedService(null)

      const validation = validateCreateServiceForm(values)

      if (!validation.success) {
        setFieldErrors(validation.errors)
        setErrorMessage("Fix the highlighted fields before publishing the service.")
        setManualStage("error")
        return null
      }

      lastSubmittedValuesRef.current = values

      const selectedAgent = getAgentById(validation.data.agentId)

      if (!selectedAgent) {
        setErrorMessage(
          "Choose one of your synced agents before creating a service.",
        )
        setManualStage("error")
        return null
      }

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

      const authSession = await auth.ensureAuthenticated()
      if (!authSession) {
        setErrorMessage(
          auth.errorMessage ??
            "Wallet sign-in is required before AgentCommerce can save and publish this service.",
        )
        setManualStage("error")
        return null
      }

      const agentRefs = getAgentOnchainReferences(selectedAgent)
      const onchainAgentId =
        agentRefs.onchainAgentId ??
        (selectedAgent.id === options.preferredAgentId
          ? options.fallbackOnchainAgentId ?? null
          : null)

      if (onchainAgentId === null) {
        setErrorMessage(
          "This agent is not fully synced to the appchain yet. Refresh the agent state, then try again.",
        )
        setManualStage("error")
        return null
      }

      setManualStage("saving_metadata")

      let backendService: AgentServiceDto | null = null
      let nextWarning: string | null = null
      const deliverableDefinition = getServiceDeliverableDefinition(
        validation.data.deliverableType,
      )

      try {
        const response = await agentCommerceApi.createService(selectedAgent.id, {
          title: validation.data.title,
          description: validation.data.description,
          priceAmount: validation.data.priceAmount,
          priceDenom: agentCommerceConfig.appchain.nativeCurrency.symbol,
          estimatedDeliveryMinutes:
            validation.data.estimatedDeliveryMinutes ?? undefined,
          metadata: {
            marketplace: {
              coverImageUrl: validation.data.coverImageUrl,
            },
            fulfillment: buildServiceFulfillmentMetadata(
              validation.data.executionMode,
              validation.data.deliverableType,
            ),
            deliverable: {
              type: validation.data.deliverableType,
              label: deliverableDefinition.label,
              automation: deliverableDefinition.automationLevel,
            },
            onchain: {
              agentId: onchainAgentId.toString(),
              chainId: agentCommerceConfig.appchain.interwovenChainId,
            },
            payment: {
              payableAmount: validation.data.payableAmount.toString(),
              currency: null,
              denom: agentCommerceConfig.appchain.nativeCurrency.symbol,
              displayAmount: validation.data.priceAmount,
            },
            contract: {
              address:
                agentRefs.contractAddress ??
                agentCommerceConfig.contracts.agentRegistry,
            },
          },
        })

        backendService = response.data
      } catch (error) {
        const message = getApiErrorMessage(error)
        setErrorMessage(message)
        setManualStage("error")
        return null
      }

      const contractResult = await contractAction.execute({
        agentId: onchainAgentId,
        title: validation.data.title,
        description: validation.data.description,
        price: validation.data.payableAmount,
      })

      if (!contractResult.success) {
        const message =
          backendService !== null
            ? `${contractResult.error.message} Your backend draft service was saved and can be completed later.`
            : contractResult.error.message
        setErrorMessage(message)
        setManualStage("error")
        return null
      }

      if (backendService) {
        setManualStage("syncing_backend")

        try {
          const updatedResponse = await agentCommerceApi.updateService(
            backendService.id,
            {
              metadata: {
                ...(backendService.metadata &&
                typeof backendService.metadata === "object" &&
                !Array.isArray(backendService.metadata)
                  ? backendService.metadata
                  : {}),
                marketplace: {
                  ...(backendService.metadata &&
                  typeof backendService.metadata === "object" &&
                  !Array.isArray(backendService.metadata) &&
                  backendService.metadata.marketplace &&
                  typeof backendService.metadata.marketplace === "object" &&
                  !Array.isArray(backendService.metadata.marketplace)
                    ? backendService.metadata.marketplace
                    : {}),
                  coverImageUrl: validation.data.coverImageUrl,
                },
                fulfillment: buildServiceFulfillmentMetadata(
                  validation.data.executionMode,
                  validation.data.deliverableType,
                ),
                deliverable: {
                  type: validation.data.deliverableType,
                  label: deliverableDefinition.label,
                  automation: deliverableDefinition.automationLevel,
                },
                onchain: {
                  agentId: onchainAgentId.toString(),
                  serviceId: contractResult.data.serviceId?.toString() ?? null,
                  chainId: agentCommerceConfig.appchain.interwovenChainId,
                },
                payment: {
                  payableAmount: validation.data.payableAmount.toString(),
                  currency: null,
                  denom: agentCommerceConfig.appchain.nativeCurrency.symbol,
                  displayAmount: validation.data.priceAmount,
                },
                contract: {
                  address:
                    agentRefs.contractAddress ??
                    agentCommerceConfig.contracts.agentRegistry,
                },
              },
            },
          )

          backendService = updatedResponse.data

          const publishedResponse = await agentCommerceApi.publishService(
            backendService.id,
          )
          backendService = publishedResponse.data
        } catch (error) {
          if (error instanceof AgentCommerceApiError && error.status === 409) {
            nextWarning = getApiErrorMessage(error)
          } else {
            nextWarning =
              getApiErrorMessage(error) ??
              "The on-chain service was created, but the backend listing still needs publishing."
          }
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["api", "services"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["api", "agents"],
        }),
        queryClient.invalidateQueries({
          queryKey: apiQueryKeys.agent(selectedAgent.id),
        }),
      ])

      const result = {
        backendService,
        backendAgent: selectedAgent,
        txHash: contractResult.txHash,
        onChainServiceId: contractResult.data.serviceId,
        warningMessage: nextWarning,
      } satisfies CreateServiceSuccess

      session.markSessionUsed("dashboard")
      setCreatedService(result)
      setWarningMessage(nextWarning)
      setManualStage("success")
      return result
    },
    [
      auth,
      auth.errorMessage,
      contractAction,
      getAgentById,
      options.fallbackOnchainAgentId,
      options.preferredAgentId,
      queryClient,
      session,
      wallet.expectedChainId,
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
    createdService,
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
    auth,
    ownedAgentsQuery,
    availableAgents,
    getAgentById,
    initialValues: {
      ...initialCreateServiceFormValues,
      agentId: options.preferredAgentId ?? initialCreateServiceFormValues.agentId,
    },
  }
}
