"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useOrder, useTasks, useTransactions } from "@/hooks/api"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { useBackendAuth } from "@/hooks/auth"
import { useServiceEscrowActions } from "@/hooks/contracts/useServiceEscrowActions"
import { useSession } from "@/components/providers/SessionProvider"
import { agentCommerceApi, getApiErrorMessage } from "@/lib/api"
import { buildPaymentRecoveryInput } from "@/lib/orders/payment-recovery"
import type {
  DeliveryStatus,
  OrderDto,
  OrderPaymentStatus,
  OrderRevisionRequest,
  OrderStatus,
} from "@/lib/api/types"
import { useWalletConnectionFlow } from "@/hooks/wallet"

type SearchParamReader = {
  get(name: string): string | null
}

export type OrderViewerRole = "customer" | "agent_owner"
type DerivedOrderViewerRole = OrderViewerRole | null

type NextOrderActionKind =
  | "wait_payment"
  | "wait_delivery"
  | "mark_in_progress"
  | "mark_delivered"
  | "confirm_completion"
  | "wait_customer"
  | "completed"
  | "cancelled"
  | "syncing"

type OrderNextAction = {
  kind: NextOrderActionKind
  title: string
  description: string
  ctaLabel?: string
  helperText?: string
  requiresDeliveryInput?: boolean
  actionDisabled?: boolean
}

function parseBigIntCandidate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    return BigInt(value)
  } catch {
    return null
  }
}

function normalizeText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isValidViewerRole(value: string | null): value is OrderViewerRole {
  return value === "customer" || value === "agent_owner"
}

function isProviderQuotaFailureMessage(value: string | null | undefined) {
  if (!value) {
    return false
  }

  const normalized = value.toLowerCase()
  return (
    normalized.includes("no remaining quota") ||
    normalized.includes("insufficient_quota") ||
    normalized.includes("exceeded your current quota") ||
    normalized.includes("openai account")
  )
}

function buildCustomerNextAction(input: {
  order: OrderDto | null
  onchainOrderId: bigint | null
  pendingOnly: boolean
  activeRevision: OrderRevisionRequest | null
}): OrderNextAction {
  if (!input.order) {
    return {
      kind: "syncing",
      title: input.pendingOnly ? "Payment is being confirmed" : "Order details are unavailable",
      description:
        input.pendingOnly
          ? "This handoff only has the transaction context so far. The backend order record has not been indexed yet."
          : "The backend has not returned an order record for this page yet.",
    }
  }

  if (
    input.order.status === "CANCELLED" ||
    input.order.status === "FAILED"
  ) {
    if (
      input.order.status === "FAILED" &&
      input.order.paymentStatus === "PAID" &&
      isProviderQuotaFailureMessage(input.order.delivery.text)
    ) {
      return {
        kind: "cancelled",
        title: "AI fulfillment is waiting on provider billing",
        description:
          "Your payment is still secured, but the automated agent cannot continue until the agent owner restores AI billing or resumes the order manually.",
        helperText:
          "You can keep this order open. The next delivery will appear here once the owner resolves the AI provider issue.",
      }
    }

    return {
      kind: "cancelled",
      title: "This order needs attention",
      description:
        "The order did not reach completion. Review the payment and delivery details below before taking the next step.",
    }
  }

  if (
    input.order.status === "PENDING" ||
    input.order.paymentStatus === "UNPAID" ||
    input.order.paymentStatus === "PENDING"
  ) {
    return {
      kind: "wait_payment",
      title: "Payment is moving through the appchain",
      description:
        "Once payment is confirmed, the agent can begin work and the order timeline will update automatically.",
    }
  }

  if (input.order.status === "PAID" || input.order.status === "IN_PROGRESS") {
    return {
      kind: "wait_delivery",
      title: input.activeRevision ? "Your revision is being handled" : "The agent is working on your order",
      description:
        input.activeRevision
          ? "AgentCommerce is generating an updated delivery from your latest revision request."
          : "Delivery details are not attached to this order yet.",
    }
  }

  if (input.order.status === "DELIVERED") {
    if (input.activeRevision) {
      return {
        kind: "wait_delivery",
        title: "Updated delivery in progress",
        description:
          "Your latest revision request is being worked on. The delivery preview will refresh when the new version is ready.",
      }
    }

    if (input.onchainOrderId === null) {
      return {
        kind: "syncing",
        title: "Delivery is ready for your review",
        description:
          "The delivery is already attached, but this page does not have the indexed on-chain order reference needed for final confirmation yet.",
      }
    }

    return {
      kind: "confirm_completion",
      title: "Review the delivery and confirm completion",
      description:
        "If everything looks good, confirm completion to release the final settlement to the agent.",
      ctaLabel: "Confirm Completion",
      helperText:
        "This confirmation is the final customer step in the on-chain commerce flow.",
    }
  }

  if (input.order.status === "COMPLETED") {
    return {
      kind: "completed",
      title: "This order is complete",
      description:
        "Payment and delivery have both been finalized. You can keep this page as a transparent record of what happened.",
    }
  }

  return {
    kind: "syncing",
    title: "Order updates are unavailable",
    description:
      "This page does not have enough indexed backend data to show the next customer action yet.",
  }
}

function buildAgentOwnerNextAction(input: {
  order: OrderDto | null
  onchainOrderId: bigint | null
  activeRevision: OrderRevisionRequest | null
}): OrderNextAction {
  if (!input.order) {
    return {
      kind: "syncing",
      title: "Order details are unavailable",
      description:
        "This page cannot show fulfillment actions until the backend order record exists.",
    }
  }

  if (
    input.order.status === "CANCELLED" ||
    (input.order.status === "FAILED" &&
      input.order.paymentStatus !== "PAID")
  ) {
    return {
      kind: "cancelled",
      title: "This order needs manual review",
      description:
        "The order did not reach completion. Review payment and delivery details before proceeding.",
    }
  }

  if (input.order.status === "FAILED" && input.order.paymentStatus === "PAID") {
    if (isProviderQuotaFailureMessage(input.order.delivery.text)) {
      if (input.onchainOrderId === null) {
        return {
          kind: "syncing",
          title: "AI provider quota is exhausted",
          description:
            "Payment is secured, but this page still needs the indexed on-chain order reference before manual fulfillment can resume.",
          helperText:
            "Restore OpenAI billing or switch the fulfillment provider, then come back here to continue the order manually.",
        }
      }

      return {
        kind: "mark_in_progress",
        title: "Restore AI billing or fulfill manually",
        description:
          "The customer payment is secured, but automated fulfillment stopped because the configured OpenAI account has no remaining quota.",
        ctaLabel: "Resume Fulfillment",
        helperText:
          "Top up the OpenAI account or swap providers, then resume this order. You can also complete the delivery manually right now.",
      }
    }

    if (input.onchainOrderId === null) {
      return {
        kind: "syncing",
        title: "Automated fulfillment failed",
        description:
          "Payment is secured, but this page still needs the indexed on-chain order reference before manual fulfillment can resume.",
      }
    }

    return {
      kind: "mark_in_progress",
      title: "Resume fulfillment manually",
      description:
        "The automated agent run failed, but the customer payment is still secured. Resume this order manually to continue the delivery flow.",
      ctaLabel: "Resume Fulfillment",
      helperText:
        "Use this when AI execution is unavailable or needs human takeover.",
    }
  }

  if (
    input.order.status === "PENDING" ||
    input.order.paymentStatus === "UNPAID" ||
    input.order.paymentStatus === "PENDING"
  ) {
    return {
      kind: "wait_payment",
      title: "Waiting for payment confirmation",
      description:
        "The order exists, but work should begin only after the appchain confirms payment.",
    }
  }

  if (input.order.status === "PAID") {
    if (input.onchainOrderId === null) {
      return {
        kind: "syncing",
        title: "Ready to start work",
        description:
          "The order is paid, but this page does not have the indexed on-chain order reference needed to mark it in progress yet.",
      }
    }

    return {
      kind: "mark_in_progress",
      title: "Start fulfillment",
      description:
        "Mark this order in progress when you begin the work so the customer sees a clear status update.",
      ctaLabel: "Mark In Progress",
      helperText:
        "This is the owner-side handoff from paid to active fulfillment.",
    }
  }

  if (input.activeRevision) {
    return {
      kind: "wait_delivery",
      title: "A customer revision is being processed",
      description:
        "The latest customer revision request has been queued for fulfillment. Review the updated delivery once it lands.",
      helperText: `Latest revision request: ${input.activeRevision.note}`,
    }
  }

  if (input.order.status === "IN_PROGRESS") {
    if (input.onchainOrderId === null) {
      return {
        kind: "syncing",
        title: "Prepare the delivery",
        description:
          "The order is in progress, but delivery submission is unavailable here until the indexed on-chain order reference is present.",
      }
    }

    return {
      kind: "mark_delivered",
      title: "Submit the delivery",
      description:
        "Add a delivery link or a short delivery note, then mark the order delivered so the customer can review it.",
      ctaLabel: "Mark Delivered",
      helperText:
        "Include something clear and customer-friendly so the delivery feels trustworthy at a glance.",
      requiresDeliveryInput: true,
    }
  }

  if (input.order.status === "DELIVERED") {
    return {
      kind: "wait_customer",
      title: "Waiting for customer confirmation",
      description:
        "The delivery has been submitted. The next step is the customer confirming completion.",
    }
  }

  if (input.order.status === "COMPLETED") {
    return {
      kind: "completed",
      title: "This order is complete",
      description:
        "Settlement and delivery are finished. This page now acts as a transparent record for the completed order.",
    }
  }

  return {
    kind: "syncing",
    title: "Order updates are unavailable",
    description:
      "This page does not have enough indexed backend data to show the next owner action yet.",
  }
}

function buildIdentityRequiredNextAction(options: {
  order: OrderDto | null
  pendingOnly: boolean
  isAuthenticated: boolean
}): OrderNextAction {
  if (!options.isAuthenticated) {
    return {
      kind: "syncing",
      title: "Unlock backend sync to identify your role",
      description: options.pendingOnly
        ? "This temporary handoff view is available, but live role-based actions require an authenticated backend session."
        : "Connect the correct wallet and unlock backend sync to load the real customer or agent-owner actions for this order.",
    }
  }

  if (options.order) {
    return {
      kind: "syncing",
      title: "This order is not available for your active account",
      description:
        "The current backend session does not match the customer or the agent owner for this order, so role-specific actions are hidden.",
    }
  }

  return {
    kind: "syncing",
    title: "Order identity is not available yet",
    description:
      "This page cannot derive a live role until the backend order record is available.",
  }
}

function deriveViewerRole(options: {
  order: OrderDto | null
  authenticatedUserId: string | null
  fallbackRole: OrderViewerRole | null
}): DerivedOrderViewerRole {
  if (!options.order) {
    return options.fallbackRole
  }

  if (!options.authenticatedUserId) {
    return null
  }

  const isCustomer = options.order.customerId === options.authenticatedUserId
  const isAgentOwner = options.order.agent.ownerId === options.authenticatedUserId

  if (isCustomer && isAgentOwner && options.fallbackRole) {
    return options.fallbackRole
  }

  if (isCustomer) {
    return "customer"
  }

  if (isAgentOwner) {
    return "agent_owner"
  }

  return null
}

function getActiveRevisionRequest(order: OrderDto | null) {
  if (!order) {
    return null
  }

  const active = [...order.revisionRequests].reverse().find((revision) =>
    revision.status === "OPEN" || revision.status === "ADDRESSING",
  )

  return active ?? null
}

export function useOrderDetail(options: {
  orderId: string
  searchParams: SearchParamReader
}) {
  const { orderId, searchParams } = options
  const queryClient = useQueryClient()
  const wallet = useWalletConnectionFlow()
  const session = useSession()
  const auth = useBackendAuth()
  const escrow = useServiceEscrowActions()

  const isPendingOnly = searchParams.get("pending") === "1"
  const fallbackTxHash = searchParams.get("txHash")
  const fallbackAmount = searchParams.get("amount")
  const fallbackDenom = searchParams.get("denom")
  const fallbackServiceTitle = searchParams.get("serviceTitle")
  const fallbackAgentName = searchParams.get("agentName")
  const onchainOrderId = parseBigIntCandidate(searchParams.get("onchainOrderId"))

  const fallbackViewerRole = isValidViewerRole(searchParams.get("role"))
    ? (searchParams.get("role") as OrderViewerRole)
    : isPendingOnly
      ? "customer"
      : null
  const [deliveryUrlInput, setDeliveryUrlInput] = useState("")
  const [deliveryTextInput, setDeliveryTextInput] = useState("")
  const [revisionNoteInput, setRevisionNoteInput] = useState("")
  const [isRequestingRevision, setIsRequestingRevision] = useState(false)
  const [revisionRequestError, setRevisionRequestError] = useState<string | null>(null)
  const [hasAttemptedPaymentRecovery, setHasAttemptedPaymentRecovery] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionWarning, setActionWarning] = useState<string | null>(null)

  const orderQuery = useOrder(orderId, {
    enabled: !isPendingOnly && !orderId.startsWith("pending-"),
  })
  const transactionsQuery = useTransactions(
    {
      orderId,
      page: 1,
      pageSize: 4,
    },
    {
      enabled: Boolean(orderId) && !isPendingOnly && !orderId.startsWith("pending-"),
    },
  )
  const tasksQuery = useTasks(
    {
      orderId,
      page: 1,
      pageSize: 4,
    },
    {
      enabled: Boolean(orderId) && !isPendingOnly && !orderId.startsWith("pending-"),
    },
  )

  const order = orderQuery.data?.data ?? null
  const transactions = transactionsQuery.data?.data ?? []
  const tasks = tasksQuery.data?.data ?? []
  const primaryTransaction = transactions[0] ?? null

  const refetchAll = useCallback(async () => {
    if (isPendingOnly || orderId.startsWith("pending-")) {
      return
    }

    await Promise.all([
      orderQuery.refetch(),
      transactionsQuery.refetch(),
      tasksQuery.refetch(),
    ])
  }, [isPendingOnly, orderId, orderQuery, tasksQuery, transactionsQuery])

  const invalidateOrderViews = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.order(orderId),
      }),
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.transactions({ orderId, page: 1, pageSize: 4 }),
      }),
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.tasks({ orderId, page: 1, pageSize: 4 }),
      }),
      queryClient.invalidateQueries({
        queryKey: ["api", "orders"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["api", "dashboard-stats"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["api", "transactions"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["api", "tasks"],
      }),
    ])

    await refetchAll()
  }, [orderId, queryClient, refetchAll])

  useEffect(() => {
    if (!order) {
      return
    }

    if (!deliveryUrlInput && order.delivery.url) {
      setDeliveryUrlInput(order.delivery.url)
    }

    if (!deliveryTextInput && order.delivery.text) {
      setDeliveryTextInput(order.delivery.text)
    }
  }, [deliveryTextInput, deliveryUrlInput, order])

  useEffect(() => {
    if (
      hasAttemptedPaymentRecovery ||
      !order ||
      !auth.isAuthenticated ||
      isPendingOnly ||
      orderId.startsWith("pending-") ||
      transactionsQuery.isLoading ||
      transactions.length > 0 ||
      order.paymentStatus === "PAID"
    ) {
      return
    }

    const paymentRecoveryInput = buildPaymentRecoveryInput({
      order,
      fallbackTxHash,
    })

    if (!paymentRecoveryInput) {
      return
    }

    setHasAttemptedPaymentRecovery(true)

    void (async () => {
      try {
        await agentCommerceApi.createPaymentRecord(paymentRecoveryInput)

        setActionNotice(
          "AgentCommerce recovered the missing backend payment record for this order.",
        )
        await invalidateOrderViews()
      } catch (error) {
        setActionWarning(
          `${getApiErrorMessage(error)} The order is still visible here, but payment tracking may need another refresh.`,
        )
      }
    })()
  }, [
    auth.isAuthenticated,
    fallbackTxHash,
    hasAttemptedPaymentRecovery,
    invalidateOrderViews,
    isPendingOnly,
    order,
    orderId,
    transactions,
    transactionsQuery.isLoading,
  ])

  const txHash = order?.payment.txHash ?? primaryTransaction?.txHash ?? fallbackTxHash
  const amountLabel = order
    ? `${order.pricing.finalPaidAmount ?? order.pricing.quotedPrice} ${order.pricing.currency ?? order.pricing.denom}`.trim()
    : fallbackAmount
      ? `${fallbackAmount} ${fallbackDenom ?? ""}`.trim()
      : null
  const serviceTitle = order?.service.title ?? fallbackServiceTitle ?? "Order"
  const agentName = order?.agent.name ?? fallbackAgentName ?? "AgentCommerce"
  const paymentStatus = order?.paymentStatus ?? ("PENDING" as OrderPaymentStatus)
  const lifecycleStatus = order?.status ?? ("PENDING" as OrderStatus)
  const deliveryStatus = order?.deliveryStatus ?? ("PENDING" as DeliveryStatus)
  const authenticatedUserId = auth.currentSession?.user.id ?? null
  const activeRevisionRequest = getActiveRevisionRequest(order)

  const viewerRole = useMemo<DerivedOrderViewerRole>(
    () =>
      deriveViewerRole({
        order,
        authenticatedUserId,
        fallbackRole: fallbackViewerRole,
      }),
    [authenticatedUserId, fallbackViewerRole, order],
  )

  const viewerRoleLabel = viewerRole
    ? viewerRole === "customer"
      ? "Customer"
      : "Agent Owner"
    : "Role unavailable"
  const viewerRoleDescription = viewerRole
    ? "Derived from your authenticated backend session for this specific order."
    : auth.isAuthenticated
      ? "The active backend session does not map to the customer or owner for this order."
      : "Unlock backend sync with the correct wallet to load live role-based order actions."

  const nextAction = useMemo(() => {
    return viewerRole === "customer"
        ? buildCustomerNextAction({
          order,
          onchainOrderId,
          pendingOnly: isPendingOnly,
          activeRevision: activeRevisionRequest,
        })
        : viewerRole === "agent_owner"
        ? buildAgentOwnerNextAction({
          order,
          onchainOrderId,
          activeRevision: activeRevisionRequest,
        })
        : buildIdentityRequiredNextAction({
            order,
            pendingOnly: isPendingOnly,
            isAuthenticated: auth.isAuthenticated,
          })
  }, [activeRevisionRequest, auth.isAuthenticated, isPendingOnly, onchainOrderId, order, viewerRole])

  const markInProgress = useCallback(async () => {
    if (onchainOrderId === null) {
      setActionNotice(
        "This action requires the indexed on-chain order reference, which is not available in this view yet.",
      )
      return null
    }

    setActionNotice(null)
    setActionWarning(null)

    const result = await escrow.markOrderInProgress({
      orderId: onchainOrderId,
    })

    if (result.success) {
      if (order) {
        try {
          await agentCommerceApi.updateOrderStatus(order.id, {
            status: "IN_PROGRESS",
          })
        } catch (error) {
          setActionWarning(
            `${getApiErrorMessage(error)} The on-chain status changed, but the backend order view may need another refresh.`,
          )
        }
      }

      session.markSessionUsed("dashboard")
      await invalidateOrderViews()
    }

    return result
  }, [escrow, invalidateOrderViews, onchainOrderId, order, session])

  const markDelivered = useCallback(async () => {
    if (onchainOrderId === null) {
      setActionNotice(
        "Delivery cannot be submitted here until the indexed on-chain order reference is available.",
      )
      return null
    }

    const normalizedUrl = normalizeText(deliveryUrlInput)
    const normalizedText = normalizeText(deliveryTextInput)
    const deliveryRef = normalizedUrl ?? normalizedText

    if (!deliveryRef) {
      setActionNotice("Add a delivery link or a short delivery note first.")
      return null
    }

    setActionNotice(null)
    setActionWarning(null)

    const result = await escrow.markDelivered({
      orderId: onchainOrderId,
      deliveryRef,
    })

    if (result.success) {
      if (order) {
        try {
          await agentCommerceApi.attachOrderDeliverable(order.id, {
            deliveryUrl: normalizedUrl,
            deliveryText: normalizedText,
          })
        } catch (error) {
          setActionWarning(
            `${getApiErrorMessage(error)} The order was marked delivered on-chain, but the backend delivery preview may need another refresh.`,
          )
        }
      }

      session.markSessionUsed("dashboard")
      await invalidateOrderViews()
    }

    return result
  }, [
    deliveryTextInput,
    deliveryUrlInput,
    escrow,
    invalidateOrderViews,
    onchainOrderId,
    order,
    session,
  ])

  const confirmCompletion = useCallback(async () => {
    if (onchainOrderId === null) {
      setActionNotice(
        "Final confirmation is unavailable here until the indexed on-chain order reference is available.",
      )
      return null
    }

    setActionNotice(null)
    setActionWarning(null)

    const result = await escrow.confirmCompletion({
      orderId: onchainOrderId,
    })

    if (result.success) {
      if (order) {
        try {
          await agentCommerceApi.markOrderCompleted(order.id)
        } catch (error) {
          setActionWarning(
            `${getApiErrorMessage(error)} The on-chain completion succeeded, but the backend settlement state may need another refresh.`,
          )
        }
      }

      session.markSessionUsed("checkout")
      await invalidateOrderViews()
    }

    return result
  }, [escrow, invalidateOrderViews, onchainOrderId, order, session])

  const requestRevision = useCallback(async () => {
    if (!order) {
      setRevisionRequestError("Order details are unavailable.")
      return null
    }

    const note = normalizeText(revisionNoteInput)
    if (!note) {
      setRevisionRequestError("Add a short revision note first.")
      return null
    }

    setRevisionRequestError(null)
    setActionNotice(null)

    try {
      setIsRequestingRevision(true)
      await agentCommerceApi.requestOrderRevision(order.id, {
        note,
      })
      setRevisionNoteInput("")
      setActionNotice("Revision request sent. AgentCommerce is preparing an updated delivery.")
      await invalidateOrderViews()
      return true
    } catch (error) {
      const message = getApiErrorMessage(error)
      setRevisionRequestError(message)
      return null
    } finally {
      setIsRequestingRevision(false)
    }
  }, [invalidateOrderViews, order, revisionNoteInput])

  const canRequestRevision = Boolean(
    viewerRole === "customer" &&
      order &&
      order.status === "DELIVERED" &&
      activeRevisionRequest === null,
  )

  const activeContractAction = useMemo(() => {
    const actionCandidates = [
      {
        key: "confirm_completion",
        label: "Completion confirmation",
        action: escrow.confirmCompletionAction,
      },
      {
        key: "mark_delivered",
        label: "Delivery submission",
        action: escrow.markDeliveredAction,
      },
      {
        key: "mark_in_progress",
        label: "Fulfillment status update",
        action: escrow.markInProgressAction,
      },
    ]

    return (
      actionCandidates.find(
        (candidate) =>
          candidate.action.isWorking ||
          candidate.action.isError ||
          candidate.action.isSuccess,
      ) ?? null
    )
  }, [
    escrow.confirmCompletionAction,
    escrow.markDeliveredAction,
    escrow.markInProgressAction,
  ])

  return {
    wallet,
    viewerRole,
    viewerRoleLabel,
    viewerRoleDescription,
    isPendingOnly,
    onchainOrderId,
    order,
    orderQuery,
    transactions,
    transactionsQuery,
    tasks,
    tasksQuery,
    primaryTransaction,
    txHash,
    amountLabel,
    serviceTitle,
    agentName,
    paymentStatus,
    lifecycleStatus,
    deliveryStatus,
    nextAction,
    revisionRequests: order?.revisionRequests ?? [],
    activeRevisionRequest,
    canRequestRevision,
    revisionNoteInput,
    setRevisionNoteInput,
    requestRevision,
    isRequestingRevision,
    revisionRequestError,
    deliveryUrlInput,
    setDeliveryUrlInput,
    deliveryTextInput,
    setDeliveryTextInput,
    actionNotice,
    actionWarning,
    markInProgress,
    markDelivered,
    confirmCompletion,
    activeContractAction,
    isLoading:
      orderQuery.isLoading ||
      transactionsQuery.isLoading ||
      tasksQuery.isLoading,
    refetchAll,
  }
}
