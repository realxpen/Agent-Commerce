"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "@/components/providers/SessionProvider"
import { useBackendAuth } from "@/hooks/auth"
import { agentCommerceApi, getApiErrorMessage } from "@/lib/api"
import type { OrderDto, OrderReference } from "@/lib/api/types"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { useContractAction } from "@/hooks/contracts/useContractAction"
import { createOrderWithPayment } from "@/lib/contracts/service-escrow-client"
import { buildTransactionState } from "@/lib/transactions/messages"
import { buildOrderDetailsHref, type CheckoutContext } from "@/lib/orders/checkout"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { agentCommerceConfig } from "@/lib/appchain/config"

export type CreateOrderStage =
  | "idle"
  | "creating_order"
  | "awaiting_wallet"
  | "confirming"
  | "syncing"
  | "success"
  | "error"

export type CreateOrderInput = {
  customerNote: string
  customerReferences: OrderReference[]
}

type CreateOrderSuccess = {
  backendOrder: OrderDto | null
  txHash: `0x${string}`
  orderDetailsHref: string
  onchainOrderId: bigint | null
}

function getCreateOrderTransactionState(options: {
  stage: CreateOrderStage
  txHash: `0x${string}` | null
  errorMessage: string | null
  canRetry: boolean
}) {
  switch (options.stage) {
    case "creating_order":
      return buildTransactionState({
        status: "preparing",
        txHash: options.txHash,
        message: {
          title: "Preparing your order",
          description:
            "AgentCommerce is creating the order record and attaching the expected payment details before opening your wallet.",
        },
        canRetry: false,
      })
    case "awaiting_wallet":
      return buildTransactionState({
        status: options.txHash ? "submitting" : "awaiting_wallet",
        txHash: options.txHash,
        message: {
          title: options.txHash
            ? "Submitting payment"
            : "Approve payment in your wallet",
          description: options.txHash
            ? "Your wallet approved the payment and the transaction is being sent to the appchain now."
            : "Review the payment request in your wallet. This is the only blockchain step you need to confirm.",
        },
        canRetry: false,
      })
    case "confirming":
      return buildTransactionState({
        status: "pending",
        txHash: options.txHash,
        message: {
          title: "Confirming on-chain payment",
          description:
            "Your transaction is on the appchain now. AgentCommerce is waiting for confirmation before refreshing the order state.",
        },
        canRetry: false,
      })
    case "syncing":
      return buildTransactionState({
        status: "confirmed",
        txHash: options.txHash,
        message: {
          title: "Syncing your order",
          description:
            "The payment is confirmed. AgentCommerce is refreshing the order view and transaction status now.",
        },
        canRetry: false,
      })
    case "success":
      return buildTransactionState({
        status: "confirmed",
        txHash: options.txHash,
        message: {
          title: "Payment confirmed",
          description:
            "Your order was paid successfully and AgentCommerce is ready to hand you off to the order detail view.",
        },
        canRetry: false,
      })
    case "error":
      return buildTransactionState({
        status: "failed",
        txHash: options.txHash,
        errorMessage: options.errorMessage,
        message: {
          title: "Payment needs attention",
          description:
            "The order could not be completed yet. Review the message below and try again when ready.",
        },
        canRetry: options.canRetry,
        retryLabel: "Try payment again",
      })
    case "idle":
    default:
      return buildTransactionState({
        status: "idle",
        txHash: options.txHash,
        message: {
          title: "Ready for checkout",
          description:
            "AgentCommerce is ready to create the order and send the escrow payment once you continue.",
        },
        canRetry: false,
      })
  }
}

function normalizeText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeReferences(value: OrderReference[]) {
  const normalized = value
    .map((reference) => ({
      type: reference.type,
      label: reference.label.trim(),
      url: reference.url.trim(),
      note: reference.note?.trim() || null,
    }))
    .filter((reference) => reference.label.length > 0 && reference.url.length > 0)

  return normalized.length > 0 ? normalized : undefined
}

function buildWalletError(options: {
  isConfigured: boolean
  isConnected: boolean
  isOnExpectedAppchain: boolean
  description: string
}) {
  if (!options.isConfigured) {
    return options.description
  }

  if (!options.isConnected) {
    return "Connect your wallet before continuing to payment."
  }

  if (!options.isOnExpectedAppchain) {
    return options.description
  }

  return null
}

export function useCreateOrder(checkout: CheckoutContext) {
  const wallet = useWalletConnectionFlow()
  const queryClient = useQueryClient()
  const session = useSession()
  const auth = useBackendAuth()
  const contractAction = useContractAction(createOrderWithPayment)
  const lastSubmittedInputRef = useRef<CreateOrderInput | null>(null)
  const [manualStage, setManualStage] = useState<
    Exclude<CreateOrderStage, "awaiting_wallet" | "confirming">
  >("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [createdOrder, setCreatedOrder] = useState<OrderDto | null>(null)
  const [successResult, setSuccessResult] = useState<CreateOrderSuccess | null>(null)

  const stage = useMemo<CreateOrderStage>(() => {
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
      getCreateOrderTransactionState({
        stage,
        txHash: successResult?.txHash ?? contractAction.txHash,
        errorMessage,
        canRetry: lastSubmittedInputRef.current !== null,
      }),
    [contractAction.txHash, errorMessage, stage, successResult?.txHash],
  )

  const canSubmit = Boolean(
    checkout.backendServiceId &&
      checkout.backendAgentId &&
      checkout.onchainAgentId !== null &&
      checkout.onchainServiceId !== null &&
      checkout.payableAmount !== null,
  )

  const reset = useCallback(() => {
    contractAction.reset()
    setManualStage("idle")
    setErrorMessage(null)
    setWarningMessage(null)
    setCreatedOrder(null)
    setSuccessResult(null)
  }, [contractAction])

  const submit = useCallback(
    async (input: CreateOrderInput) => {
      reset()
      lastSubmittedInputRef.current = input

      const walletError = buildWalletError({
        isConfigured: wallet.isConfigured,
        isConnected: wallet.isConnected,
        isOnExpectedAppchain: wallet.isOnExpectedAppchain,
        description: wallet.networkMessage.description,
      })

      if (walletError) {
        setErrorMessage(walletError)
        setManualStage("error")
        return null
      }

      if (!canSubmit) {
        setErrorMessage(
          "This service is missing checkout metadata. Publish the on-chain service details before taking payment.",
        )
        setManualStage("error")
        return null
      }

      const paymentReference =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `order-${Date.now()}`

      let backendOrder: OrderDto | null = null
      let nextWarning: string | null = null

      setManualStage("creating_order")

      const authSession = await auth.ensureAuthenticated()

      if (!authSession) {
        nextWarning =
          auth.errorMessage ??
          "Payment can continue, but order syncing is still waiting for wallet sign-in."
      } else {
        try {
          const response = await agentCommerceApi.createOrderRecord({
            agentServiceId: checkout.backendServiceId,
            quantity: 1,
            customerNote: normalizeText(input.customerNote),
            customerReferences: normalizeReferences(input.customerReferences),
            paymentReference,
            expectedPayment: {
              chainId: agentCommerceConfig.appchain.interwovenChainId,
              amount: checkout.payableAmount!.toString(),
              currency: checkout.currency ?? undefined,
              denom: checkout.denom,
              payerAddress: wallet.hexAddress ?? undefined,
              recipientAddress: checkout.treasuryAddress || undefined,
              paymentReference,
            },
          })

          backendOrder = response.data
          setCreatedOrder(response.data)
        } catch (error) {
          nextWarning = `${getApiErrorMessage(error)} The payment can still continue, but backend order syncing may appear later.`
        }
      }

      const contractResult = await contractAction.execute({
        agentId: checkout.onchainAgentId!,
        serviceId: checkout.onchainServiceId!,
        amount: checkout.payableAmount!,
      })

      if (!contractResult.success) {
        setErrorMessage(contractResult.error.message)
        setWarningMessage(nextWarning)
        setManualStage("error")
        return null
      }

      setManualStage("syncing")

      if (backendOrder) {
        await queryClient.invalidateQueries({
          queryKey: apiQueryKeys.order(backendOrder.id),
        })
      }

      await queryClient.invalidateQueries({
        queryKey: ["api", "transactions"],
      })

      const syntheticOrderId = backendOrder
        ? backendOrder.id
        : `pending-${paymentReference}`

      const orderDetailsHref = buildOrderDetailsHref({
        orderId: syntheticOrderId,
        txHash: contractResult.txHash,
        checkout,
        pending: !backendOrder,
        onchainOrderId: contractResult.data.orderId,
        role: "customer",
      })

      const result = {
        backendOrder,
        txHash: contractResult.txHash,
        orderDetailsHref,
        onchainOrderId: contractResult.data.orderId,
      } satisfies CreateOrderSuccess

      session.markSessionUsed("checkout")
      setWarningMessage(nextWarning)
      setSuccessResult(result)
      setManualStage("success")
      return result
    },
    [
      canSubmit,
      checkout,
      contractAction,
      queryClient,
      reset,
      session,
      auth,
      auth.errorMessage,
      wallet.expectedChainId,
      wallet.hexAddress,
      wallet.isConfigured,
      wallet.isConnected,
      wallet.isOnExpectedAppchain,
      wallet.networkMessage.description,
    ],
  )

  const retry = useCallback(async () => {
    if (!lastSubmittedInputRef.current) {
      return null
    }

    return submit(lastSubmittedInputRef.current)
  }, [submit])

  return {
    submit,
    retry,
    reset,
    stage,
    isWorking:
      stage === "creating_order" ||
      stage === "awaiting_wallet" ||
      stage === "confirming" ||
      stage === "syncing",
    isSuccess: stage === "success",
    isError: stage === "error",
    canSubmit,
    errorMessage,
    warningMessage,
    transaction,
    txHash: transaction.txHash,
    createdOrder,
    successResult,
    canRetry: transaction.canRetry,
    wallet,
  }
}
