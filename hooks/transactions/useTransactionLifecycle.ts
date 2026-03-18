"use client"

import { useCallback, useMemo, useReducer } from "react"
import { buildTransactionState } from "@/lib/transactions/messages"
import type {
  TransactionLifecycleStatus,
  TransactionStateInput,
  TransactionStatusMessage,
} from "@/lib/transactions/types"
import type { Hex, NormalizedContractError } from "@/lib/contracts/types"

type TransactionLifecycleDraft = Required<
  Pick<TransactionStateInput, "status">
> &
  Omit<TransactionStateInput, "status">

type TransactionLifecycleAction =
  | { type: "PATCH"; payload: TransactionStateInput }
  | {
      type: "FAIL"
      error?: NormalizedContractError | null
      errorMessage?: string | null
      txHash?: Hex | null
      message?: Partial<TransactionStatusMessage>
      canRetry?: boolean
      retryLabel?: string
    }
  | { type: "RESET" }

function createInitialDraft(): TransactionLifecycleDraft {
  return {
    status: "idle",
    txHash: null,
    error: null,
    errorMessage: null,
    message: undefined,
    canRetry: false,
    retryLabel: undefined,
  }
}

function reducer(
  state: TransactionLifecycleDraft,
  action: TransactionLifecycleAction,
): TransactionLifecycleDraft {
  switch (action.type) {
    case "PATCH":
      return {
        ...state,
        ...action.payload,
        error:
          action.payload.error === undefined ? state.error : action.payload.error,
        errorMessage:
          action.payload.errorMessage === undefined
            ? state.errorMessage
            : action.payload.errorMessage,
        txHash:
          action.payload.txHash === undefined ? state.txHash : action.payload.txHash,
      }
    case "FAIL":
      return {
        ...state,
        status: "failed",
        error: action.error ?? state.error ?? null,
        errorMessage:
          action.errorMessage ??
          action.error?.message ??
          state.errorMessage ??
          null,
        txHash: action.txHash === undefined ? state.txHash : action.txHash,
        message: action.message ?? state.message,
        canRetry: action.canRetry ?? true,
        retryLabel: action.retryLabel ?? state.retryLabel,
      }
    case "RESET":
      return createInitialDraft()
    default:
      return state
  }
}

type SetTransactionStatusOptions = Omit<TransactionStateInput, "status">

export function useTransactionLifecycle() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialDraft)

  const setStatus = useCallback(
    (status: TransactionLifecycleStatus, options: SetTransactionStatusOptions = {}) => {
      dispatch({
        type: "PATCH",
        payload: {
          status,
          ...options,
        },
      })
    },
    [],
  )

  const reset = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  const setPreparing = useCallback(
    (options: SetTransactionStatusOptions = {}) => {
      setStatus("preparing", options)
    },
    [setStatus],
  )

  const setAwaitingWallet = useCallback(
    (options: SetTransactionStatusOptions = {}) => {
      setStatus("awaiting_wallet", options)
    },
    [setStatus],
  )

  const setSubmitting = useCallback(
    (options: SetTransactionStatusOptions = {}) => {
      setStatus("submitting", options)
    },
    [setStatus],
  )

  const setPending = useCallback(
    (options: SetTransactionStatusOptions = {}) => {
      setStatus("pending", options)
    },
    [setStatus],
  )

  const setConfirmed = useCallback(
    (options: SetTransactionStatusOptions = {}) => {
      setStatus("confirmed", {
        canRetry: false,
        ...options,
      })
    },
    [setStatus],
  )

  const setFailed = useCallback(
    (
      error?: NormalizedContractError | string | null,
      options: Omit<SetTransactionStatusOptions, "error" | "errorMessage"> = {},
    ) => {
      dispatch({
        type: "FAIL",
        error: typeof error === "string" ? null : error,
        errorMessage: typeof error === "string" ? error : error?.message,
        ...options,
      })
    },
    [],
  )

  const transaction = useMemo(() => buildTransactionState(state), [state])

  return {
    transaction,
    reset,
    setStatus,
    setPreparing,
    setAwaitingWallet,
    setSubmitting,
    setPending,
    setConfirmed,
    setFailed,
  }
}
