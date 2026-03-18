import type {
  TransactionLifecycleStatus,
  TransactionState,
  TransactionStateInput,
  TransactionStatusMessage,
} from "@/lib/transactions/types"

const DEFAULT_TRANSACTION_MESSAGES: Record<
  TransactionLifecycleStatus,
  TransactionStatusMessage
> = {
  idle: {
    title: "Ready when you are",
    description:
      "The transaction has not started yet. Review the details and continue when ready.",
  },
  preparing: {
    title: "Preparing transaction",
    description:
      "AgentCommerce is getting the transaction details ready before your wallet is needed.",
  },
  awaiting_wallet: {
    title: "Approve in your wallet",
    description:
      "Review the request in your wallet to continue. This is the approval step before submission.",
  },
  submitting: {
    title: "Submitting transaction",
    description:
      "Your wallet approved the request and the transaction is being sent to the appchain now.",
  },
  pending: {
    title: "Waiting for confirmation",
    description:
      "The transaction is on-chain now. AgentCommerce is waiting for confirmation before moving on.",
  },
  confirmed: {
    title: "Transaction confirmed",
    description:
      "The appchain confirmed the transaction successfully and the next step can continue.",
  },
  failed: {
    title: "Transaction needs attention",
    description:
      "The transaction did not complete successfully. Review the message below and try again when ready.",
  },
}

export function getTransactionStatusMessage(
  status: TransactionLifecycleStatus,
): TransactionStatusMessage {
  return DEFAULT_TRANSACTION_MESSAGES[status]
}

export function buildTransactionState(
  input: TransactionStateInput,
): TransactionState {
  const baseMessage = getTransactionStatusMessage(input.status)
  const title = input.message?.title?.trim() || baseMessage.title
  const description =
    input.message?.description?.trim() || baseMessage.description
  const errorMessage = input.errorMessage ?? input.error?.message ?? null
  const canRetry = input.canRetry ?? input.status === "failed"
  const retryLabel = input.retryLabel ?? "Try again"
  const isPreparing = input.status === "preparing"
  const isAwaitingWallet = input.status === "awaiting_wallet"
  const isSubmitting = input.status === "submitting"
  const isPending = input.status === "pending"
  const isConfirmed = input.status === "confirmed"
  const isFailed = input.status === "failed"

  return {
    status: input.status,
    txHash: input.txHash ?? null,
    title,
    description,
    error: input.error ?? null,
    errorMessage,
    canRetry,
    retryLabel,
    isIdle: input.status === "idle",
    isPreparing,
    isAwaitingWallet,
    isSubmitting,
    isPending,
    isConfirmed,
    isFailed,
    isWorking:
      isPreparing || isAwaitingWallet || isSubmitting || isPending,
    isTerminal: isConfirmed || isFailed,
  }
}
