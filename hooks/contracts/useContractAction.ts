"use client"

import { useCallback, useMemo, useState } from "react"
import { useInterwovenKit } from "@initia/interwovenkit-react"
import { useSession } from "@/components/providers/SessionProvider"
import { agentCommerceConfig } from "@/lib/appchain/config"
import type {
  ContractActionResult,
  ContractActionStatus,
  ContractExecutionOptions,
  Hex,
  NormalizedContractError,
} from "@/lib/contracts/types"
import { useTransactionLifecycle } from "@/hooks/transactions"
import { useWalletAccount } from "@/hooks/wallet"

type ContractExecutor<TInput, TData> = (
  input: TInput,
  options?: ContractExecutionOptions,
) => Promise<ContractActionResult<TData>>

type UseContractActionOptions = {
  autoSignMode?: "enabled" | "disabled"
}

export function useContractAction<TInput, TData>(
  executor: ContractExecutor<TInput, TData>,
  options: UseContractActionOptions = {},
) {
  const session = useSession()
  const wallet = useWalletAccount()
  const { autoSign, requestTxSync, submitTxSync, waitForTxConfirmation } =
    useInterwovenKit()
  const [status, setStatus] = useState<ContractActionStatus>("idle")
  const [result, setResult] = useState<ContractActionResult<TData> | null>(null)
  const [error, setError] = useState<NormalizedContractError | null>(null)
  const lifecycle = useTransactionLifecycle()
  const autoSignContext = useMemo(() => {
    const interwovenChainId = agentCommerceConfig.appchain.interwovenChainId

    return {
      enabled:
        options.autoSignMode !== "disabled" &&
        session.isSessionActive &&
        Boolean(wallet.initiaAddress) &&
        Boolean(autoSign.isEnabledByChain[interwovenChainId]),
      chainId: interwovenChainId,
      senderAddress: wallet.initiaAddress ?? null,
      preferredFeeDenom: agentCommerceConfig.appchain.nativeDenom,
      requestTxSync,
      submitTxSync,
      waitForTxConfirmation,
    } satisfies ContractExecutionOptions["autoSignContext"]
  }, [
    autoSign.isEnabledByChain,
    requestTxSync,
    submitTxSync,
    session.isSessionActive,
    waitForTxConfirmation,
    wallet.initiaAddress,
    options.autoSignMode,
  ])

  const execute = useCallback(
    async (input: TInput, options?: ContractExecutionOptions) => {
      setStatus("preparing")
      setResult(null)
      setError(null)
      lifecycle.reset()
      lifecycle.setPreparing()

      const nextResult = await executor(input, {
        ...options,
        autoSignContext,
        onAwaitingWallet: () => {
          lifecycle.setAwaitingWallet()
          setStatus("awaiting_wallet")
          options?.onAwaitingWallet?.()
        },
        onSubmitting: (submittedHash) => {
          lifecycle.setSubmitting({
            txHash: submittedHash,
          })
          setStatus("submitting")
          options?.onSubmitting?.(submittedHash)
        },
        onSubmitted: (submittedHash) => {
          options?.onSubmitted?.(submittedHash)
        },
        onPending: (submittedHash) => {
          lifecycle.setPending({
            txHash: submittedHash,
          })
          setStatus("pending")
          options?.onPending?.(submittedHash)
        },
        onConfirmed: (submittedHash, receipt) => {
          lifecycle.setConfirmed({
            txHash: submittedHash,
          })
          setStatus("confirmed")
          options?.onConfirmed?.(submittedHash, receipt)
        },
        onFailed: (nextError, submittedHash) => {
          lifecycle.setFailed(nextError, {
            txHash: submittedHash ?? null,
          })
          setError(nextError)
          setStatus("failed")
          options?.onFailed?.(nextError, submittedHash)
        },
      })

      setResult(nextResult)

      if (nextResult.success) {
        lifecycle.setConfirmed({
          txHash: nextResult.txHash,
        })
        setStatus("confirmed")
        return nextResult
      }

      lifecycle.setFailed(nextResult.error, {
        txHash: nextResult.txHash ?? null,
      })
      setError(nextResult.error)
      setStatus("failed")
      return nextResult
    },
    [autoSignContext, executor, lifecycle],
  )

  const reset = useCallback(() => {
    setStatus("idle")
    setResult(null)
    setError(null)
    lifecycle.reset()
  }, [lifecycle])

  return useMemo(
    () => ({
      execute,
      reset,
      status,
      txHash: lifecycle.transaction.txHash,
      transaction: lifecycle.transaction,
      result,
      error,
      isIdle: status === "idle",
      isPreparing: status === "preparing",
      isAwaitingWallet: status === "awaiting_wallet",
      isSubmitting:
        status === "awaiting_wallet" || status === "submitting",
      isConfirming: status === "pending",
      isPending: status === "pending",
      isSuccess: status === "confirmed",
      isError: status === "failed",
      isWorking:
        status === "preparing" ||
        status === "awaiting_wallet" ||
        status === "submitting" ||
        status === "pending",
    }),
    [error, execute, lifecycle.transaction, reset, result, status],
  )
}
