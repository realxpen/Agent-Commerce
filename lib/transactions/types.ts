import type { Hex, NormalizedContractError } from "@/lib/contracts/types"

export type TransactionLifecycleStatus =
  | "idle"
  | "preparing"
  | "awaiting_wallet"
  | "submitting"
  | "pending"
  | "confirmed"
  | "failed"

export type TransactionStatusMessage = {
  title: string
  description: string
}

export type TransactionStateInput = {
  status: TransactionLifecycleStatus
  txHash?: Hex | null
  error?: NormalizedContractError | null
  errorMessage?: string | null
  message?: Partial<TransactionStatusMessage>
  canRetry?: boolean
  retryLabel?: string
}

export type TransactionState = {
  status: TransactionLifecycleStatus
  txHash: Hex | null
  title: string
  description: string
  error: NormalizedContractError | null
  errorMessage: string | null
  canRetry: boolean
  retryLabel: string
  isIdle: boolean
  isPreparing: boolean
  isAwaitingWallet: boolean
  isSubmitting: boolean
  isPending: boolean
  isConfirmed: boolean
  isFailed: boolean
  isWorking: boolean
  isTerminal: boolean
}
