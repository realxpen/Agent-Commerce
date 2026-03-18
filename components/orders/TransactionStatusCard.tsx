"use client"

import { TransactionStatusPanel } from "@/components/transactions"
import type { TransactionState } from "@/lib/transactions/types"

export function TransactionStatusCard({
  transaction,
  warningMessage,
  helperMessage,
  onRetry,
  isAutoSigning,
}: {
  transaction: TransactionState
  warningMessage?: string | null
  helperMessage?: string | null
  onRetry?: (() => void) | null
  isAutoSigning?: boolean
}) {
  return (
    <TransactionStatusPanel
      transaction={transaction}
      warningMessage={warningMessage}
      helperMessage={helperMessage}
      onRetry={onRetry}
      isAutoSigning={isAutoSigning}
    />
  )
}
