"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { agentCommerceApi, getApiErrorMessage } from "@/lib/api"
import type { OrderDto } from "@/lib/api/types"
import { buildPaymentRecoveryInput } from "@/lib/orders/payment-recovery"

export function useRecoverMissingPayments(options: {
  orders: OrderDto[]
  enabled: boolean
  fallbackTxHashes?: Record<string, string | null | undefined>
}) {
  const { enabled, fallbackTxHashes, orders } = options
  const queryClient = useQueryClient()
  const attemptedOrderIdsRef = useRef<Set<string>>(new Set())
  const [isRecovering, setIsRecovering] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const recoveryCandidates = useMemo(
    () =>
      orders
        .map((order) => ({
          order,
          input: buildPaymentRecoveryInput({
            order,
            fallbackTxHash: fallbackTxHashes?.[order.id] ?? null,
          }),
        }))
        .filter(
          (candidate): candidate is { order: OrderDto; input: NonNullable<typeof candidate.input> } =>
            candidate.input !== null,
        ),
    [fallbackTxHashes, orders],
  )

  useEffect(() => {
    if (!enabled || recoveryCandidates.length === 0) {
      return
    }

    const pendingCandidates = recoveryCandidates.filter(
      ({ order }) => !attemptedOrderIdsRef.current.has(order.id),
    )

    if (pendingCandidates.length === 0) {
      return
    }

    let cancelled = false

    for (const candidate of pendingCandidates) {
      attemptedOrderIdsRef.current.add(candidate.order.id)
    }

    void (async () => {
      setIsRecovering(true)
      let recoveredCount = 0
      const failures: string[] = []

      for (const candidate of pendingCandidates) {
        try {
          await agentCommerceApi.createPaymentRecord(candidate.input)
          recoveredCount += 1
        } catch (error) {
          failures.push(getApiErrorMessage(error))
        }
      }

      if (cancelled) {
        return
      }

      if (recoveredCount > 0) {
        const label =
          recoveredCount === 1
            ? "AgentCommerce repaired one missing payment record while loading live data."
            : `AgentCommerce repaired ${recoveredCount} missing payment records while loading live data.`
        setNotice(label)

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
          `${uniqueFailures[0]} Older order payments may need another refresh before they appear everywhere.`,
        )
      } else if (recoveredCount > 0) {
        setWarning(null)
      }

      setIsRecovering(false)
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, queryClient, recoveryCandidates])

  return {
    isRecovering,
    notice,
    warning,
  }
}
