"use client"

import { useMemo } from "react"
import {
  confirmCompletion,
  createOrderWithPayment,
  markDelivered,
  markOrderInProgress,
} from "@/lib/contracts/service-escrow-client"
import { useContractAction } from "@/hooks/contracts/useContractAction"

export function useServiceEscrowActions() {
  const createOrderAction = useContractAction(createOrderWithPayment)
  const markInProgressAction = useContractAction(markOrderInProgress)
  const markDeliveredAction = useContractAction(markDelivered)
  const confirmCompletionAction = useContractAction(confirmCompletion)

  return useMemo(
    () => ({
      createOrderWithPayment: createOrderAction.execute,
      markOrderInProgress: markInProgressAction.execute,
      markDelivered: markDeliveredAction.execute,
      confirmCompletion: confirmCompletionAction.execute,
      createOrderAction,
      markInProgressAction,
      markDeliveredAction,
      confirmCompletionAction,
    }),
    [
      confirmCompletionAction,
      createOrderAction,
      markDeliveredAction,
      markInProgressAction,
    ],
  )
}
