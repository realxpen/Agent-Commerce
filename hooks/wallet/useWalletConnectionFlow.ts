"use client"

import { useCallback, useMemo, useState } from "react"
import { useWalletAccount } from "@/hooks/wallet/useWalletAccount"
import { useWalletActions } from "@/hooks/wallet/useWalletActions"
import { useAppchainConnection } from "@/hooks/wallet/useAppchainConnection"
import {
  getWalletStatusDescription,
  getWalletStatusLabel,
  getWalletUiState,
  normalizeWalletError,
} from "@/lib/wallet/format"

export function useWalletConnectionFlow() {
  const account = useWalletAccount()
  const actions = useWalletActions()
  const appchain = useAppchainConnection()
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<ReturnType<typeof normalizeWalletError> | null>(null)

  const runAction = useCallback(async (action: () => void | Promise<void>) => {
    setError(null)
    setIsWorking(true)

    try {
      await Promise.resolve(action())
    } catch (caughtError) {
      setError(normalizeWalletError(caughtError))
    } finally {
      setIsWorking(false)
    }
  }, [])

  const connect = useCallback(() => {
    return runAction(() => actions.connect())
  }, [actions, runAction])

  const disconnect = useCallback(() => {
    return runAction(() => actions.disconnect())
  }, [actions, runAction])

  const openWallet = useCallback(() => {
    return runAction(() => actions.openWallet())
  }, [actions, runAction])

  const openBridge = useCallback(
    (defaultValues?: { srcChainId?: string; srcDenom?: string }) => {
      return runAction(() => actions.openBridge(defaultValues))
    },
    [actions, runAction],
  )

  const switchNetwork = useCallback(() => {
    return runAction(() => actions.switchNetwork())
  }, [actions, runAction])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const isBusy = isWorking || account.isConnecting
  const walletState = getWalletUiState({
    isConfigured: appchain.isConfigured,
    isConnected: account.isConnected,
    isConnecting: isBusy,
    isOnSupportedChain: appchain.isOnSupportedChain,
    hasError: Boolean(error),
  })
  const walletStatusLabel = getWalletStatusLabel(walletState)
  const walletStatusDescription = error?.message ?? appchain.networkMessage.description

  return useMemo(
    () => ({
      ...account,
      ...appchain,
      connect,
      disconnect,
      openWallet,
      openBridge,
      switchNetwork,
      clearError,
      error,
      errorMessage: error?.message ?? null,
      errorTitle: error?.title ?? null,
      isBusy,
      walletState,
      walletStatusLabel,
      walletStatusDescription,
      walletStatusTitle: error?.title ?? appchain.networkMessage.title,
    }),
    [
      account,
      appchain,
      clearError,
      connect,
      disconnect,
      error,
      isBusy,
      openBridge,
      openWallet,
      switchNetwork,
      walletStatusDescription,
      walletStatusLabel,
      walletState,
    ],
  )
}
