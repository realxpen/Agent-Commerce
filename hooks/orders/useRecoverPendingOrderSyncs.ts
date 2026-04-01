"use client"

import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { agentCommerceApi, getApiErrorMessage } from "@/lib/api"
import {
  readPendingOrderSyncs,
  removePendingOrderSync,
  upsertPendingOrderSync,
} from "@/lib/orders/pending-order-sync"

function buildRecoveryNotice(options: {
  recoveredOrderCount: number
  recoveredPaymentCount: number
}) {
  const parts: string[] = []

  if (options.recoveredOrderCount > 0) {
    parts.push(
      options.recoveredOrderCount === 1
        ? "AgentCommerce repaired one missing backend order."
        : `AgentCommerce repaired ${options.recoveredOrderCount} missing backend orders.`,
    )
  }

  if (options.recoveredPaymentCount > 0) {
    parts.push(
      options.recoveredPaymentCount === 1
        ? "It also restored one missing payment sync."
        : `It also restored ${options.recoveredPaymentCount} missing payment syncs.`,
    )
  }

  return parts.join(" ")
}

export function useRecoverPendingOrderSyncs(options: { enabled: boolean }) {
  const { enabled } = options
  const queryClient = useQueryClient()
  const attemptedSyncIdsRef = useRef<Set<string>>(new Set())
  const [isRecovering, setIsRecovering] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const pendingRecords = readPendingOrderSyncs().filter(
      (entry) => !attemptedSyncIdsRef.current.has(entry.id),
    )

    if (pendingRecords.length === 0) {
      return
    }

    let cancelled = false

    for (const record of pendingRecords) {
      attemptedSyncIdsRef.current.add(record.id)
    }

    void (async () => {
      setIsRecovering(true)
      let recoveredOrderCount = 0
      let recoveredPaymentCount = 0
      const failures: string[] = []

      for (const record of pendingRecords) {
        try {
          let backendOrderId = record.backendOrderId

          if (!backendOrderId) {
            const orderResponse = await agentCommerceApi.createOrderRecord({
              ...record.orderInput,
              txHash:
                record.orderInput.txHash ??
                record.paymentInput.txHash ??
                record.txHash,
              expectedPayment: record.orderInput.expectedPayment
                ? {
                    ...record.orderInput.expectedPayment,
                    txHash:
                      record.orderInput.expectedPayment.txHash ??
                      record.paymentInput.txHash ??
                      record.txHash,
                  }
                : undefined,
            })

            backendOrderId = orderResponse.data.id
            recoveredOrderCount += 1

            upsertPendingOrderSync({
              ...record,
              backendOrderId,
              updatedAt: new Date().toISOString(),
            })
          }

          await agentCommerceApi.updateOrderStatus(backendOrderId, {
            status: "PENDING",
            paymentReference: record.paymentReference,
            txHash: record.paymentInput.txHash ?? record.txHash,
            onchainOrderId: record.onchainOrderId ?? undefined,
          })

          await agentCommerceApi.createPaymentRecord({
            orderId: backendOrderId,
            ...record.paymentInput,
          })
          recoveredPaymentCount += 1
          removePendingOrderSync(record.id)
        } catch (error) {
          failures.push(getApiErrorMessage(error))
        }
      }

      if (cancelled) {
        return
      }

      if (recoveredOrderCount > 0 || recoveredPaymentCount > 0) {
        setNotice(
          buildRecoveryNotice({
            recoveredOrderCount,
            recoveredPaymentCount,
          }),
        )

        await Promise.all([
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
      }

      if (failures.length > 0) {
        const uniqueFailures = [...new Set(failures)]
        setWarning(
          `${uniqueFailures[0]} Some on-chain orders still need another backend refresh before they appear everywhere.`,
        )
      } else if (recoveredOrderCount > 0 || recoveredPaymentCount > 0) {
        setWarning(null)
      }

      setIsRecovering(false)
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, queryClient])

  return {
    isRecovering,
    notice,
    warning,
  }
}
