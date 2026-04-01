"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useCustomerOrders } from "@/hooks/api"
import { useBackendAuth } from "@/hooks/auth"
import { useRecoverMissingPayments } from "@/hooks/orders/useRecoverMissingPayments"
import { useRecoverPendingOrderSyncs } from "@/hooks/orders/useRecoverPendingOrderSyncs"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { getApiErrorMessage } from "@/lib/api"
import type { OrderDto, OrderStatus } from "@/lib/api/types"

type CustomerOrdersStatusFilter = "all" | OrderStatus

export type CustomerOrderListItem = {
  id: string
  serviceTitle: string
  agentName: string
  amountLabel: string
  lifecycleStatus: OrderStatus
  paymentStatus: OrderDto["paymentStatus"]
  deliveryStatus: OrderDto["deliveryStatus"]
  createdLabel: string
  updatedLabel: string
  nextStepLabel: string
  hasOpenRevision: boolean
}

function formatRelativeTime(timestamp: string) {
  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) {
    return "Just now"
  }

  const diffMs = value.getTime() - Date.now()
  const absoluteMinutes = Math.round(Math.abs(diffMs) / (60 * 1000))
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  if (absoluteMinutes < 1) {
    return "Just now"
  }

  if (absoluteMinutes < 60) {
    return formatter.format(Math.round(diffMs / (60 * 1000)), "minute")
  }

  const absoluteHours = Math.round(absoluteMinutes / 60)
  if (absoluteHours < 24) {
    return formatter.format(Math.round(diffMs / (60 * 60 * 1000)), "hour")
  }

  return formatter.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day")
}

function buildNextStepLabel(order: OrderDto) {
  const activeRevision = order.revisionRequests.find(
    (revision) => revision.status === "OPEN" || revision.status === "ADDRESSING",
  )

  if (activeRevision) {
    return order.deliveryStatus === "AWAITING_REVIEW"
      ? "Updated delivery is waiting on owner review"
      : "Revision in progress"
  }

  if (order.deliveryStatus === "AWAITING_REVIEW") {
    return "Owner review in progress"
  }

  if (order.status === "DELIVERED") {
    return "Review delivery or request changes"
  }

  if (order.status === "COMPLETED") {
    return "Completed"
  }

  if (order.status === "IN_PROGRESS" || order.status === "PAID") {
    return "Agent is working on it"
  }

  if (order.status === "PENDING") {
    return "Waiting for payment confirmation"
  }

  return "Needs attention"
}

function mapOrder(order: OrderDto): CustomerOrderListItem {
  return {
    id: order.id,
    serviceTitle: order.service.title,
    agentName: order.agent.name,
    amountLabel: `${order.pricing.finalPaidAmount ?? order.pricing.quotedPrice} ${
      order.pricing.currency ?? order.pricing.denom
    }`.trim(),
    lifecycleStatus: order.status,
    paymentStatus: order.paymentStatus,
    deliveryStatus: order.deliveryStatus,
    createdLabel: formatRelativeTime(order.createdAt),
    updatedLabel: formatRelativeTime(order.updatedAt),
    nextStepLabel: buildNextStepLabel(order),
    hasOpenRevision: order.revisionRequests.some(
      (revision) => revision.status === "OPEN" || revision.status === "ADDRESSING",
    ),
  }
}

export function useCustomerOrdersDirectory() {
  const wallet = useWalletConnectionFlow()
  const auth = useBackendAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<CustomerOrdersStatusFilter>("all")
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())
  const queriesEnabled =
    wallet.isConnected && auth.isAuthenticated && Boolean(auth.currentSession?.user.id)

  const ordersQuery = useCustomerOrders(
    auth.currentSession?.user.id,
    {
      page: 1,
      pageSize: 50,
    },
    {
      enabled: queriesEnabled,
    },
  )

  const orders = ordersQuery.data?.data ?? []
  const pendingOrderSyncRecovery = useRecoverPendingOrderSyncs({
    enabled: queriesEnabled,
  })
  const paymentRecovery = useRecoverMissingPayments({
    orders,
    enabled: queriesEnabled,
  })
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesStatus =
          statusFilter === "all" || order.status === statusFilter
        const matchesSearch =
          deferredSearchQuery.length === 0 ||
          [
            order.service.title,
            order.agent.name,
            order.id,
            order.payment.reference ?? "",
            order.payment.txHash ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(deferredSearchQuery)

        return matchesStatus && matchesSearch
      })
      .map(mapOrder)
  }, [deferredSearchQuery, orders, statusFilter])

  const reviewReadyCount = filteredOrders.filter(
    (order) => order.lifecycleStatus === "DELIVERED" && !order.hasOpenRevision,
  ).length
  const inProgressCount = filteredOrders.filter(
    (order) =>
      order.lifecycleStatus === "PENDING" ||
      order.lifecycleStatus === "PAID" ||
      order.lifecycleStatus === "IN_PROGRESS",
  ).length
  const completedCount = filteredOrders.filter(
    (order) => order.lifecycleStatus === "COMPLETED",
  ).length

  return {
    wallet,
    auth,
    orders: filteredOrders,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    reviewReadyCount,
    inProgressCount,
    completedCount,
    hasAnyData: orders.length > 0,
    isLoading: queriesEnabled && ordersQuery.isLoading,
    isFetching: queriesEnabled && ordersQuery.isFetching,
    isError: ordersQuery.isError,
    error: ordersQuery.error,
    errorMessage: ordersQuery.error ? getApiErrorMessage(ordersQuery.error) : null,
    recoveryNotice: [
      pendingOrderSyncRecovery.notice,
      paymentRecovery.notice,
    ]
      .filter(Boolean)
      .join(" ") || null,
    recoveryWarning: [
      pendingOrderSyncRecovery.warning,
      paymentRecovery.warning,
    ]
      .filter(Boolean)
      .join(" ") || null,
    isRecoveringPayments:
      pendingOrderSyncRecovery.isRecovering || paymentRecovery.isRecovering,
    refetch: ordersQuery.refetch,
  }
}
