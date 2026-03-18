"use client"

import { useMemo } from "react"
import { useChainId } from "wagmi"
import {
  agentCommerceAppchain,
  agentCommerceConfig,
  formatCurrentNetworkLabel,
  getAppchainNetworkMessage,
  getAppchainNetworkState,
} from "@/lib/appchain/config"
import { useWalletAccount } from "@/hooks/wallet/useWalletAccount"

export type WalletConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"

export function useAppchainConnection() {
  const chainId = useChainId()
  const account = useWalletAccount()

  return useMemo(
    () => {
      const walletConnectionState: WalletConnectionState = account.isConnecting
        ? "connecting"
        : account.isConnected
          ? "connected"
          : "disconnected"
      const currentChainId = account.isConnected ? chainId : null
      const expectedChainId = agentCommerceConfig.appchain.chainId
      const expectedNetworkLabel = agentCommerceConfig.appchain.displayName
      const isOnExpectedAppchain = currentChainId === expectedChainId
      const isConfigured = agentCommerceConfig.status.walletReady
      const networkState = getAppchainNetworkState({
        isConfigured,
        isConnected: account.isConnected,
        isConnecting: account.isConnecting,
        isOnExpectedAppchain,
      })

      return {
        walletConnectionState,
        networkState,
        currentChainId,
        chainId: currentChainId,
        expectedChainId,
        interwovenChainId: agentCommerceConfig.appchain.interwovenChainId,
        isConfigured,
        isWalletReady: agentCommerceConfig.status.walletReady,
        isContractsReady: agentCommerceConfig.status.contractsReady,
        isApiReady: agentCommerceConfig.status.apiReady,
        configStatus: agentCommerceConfig.status,
        currentNetworkLabel: formatCurrentNetworkLabel({
          currentChainId,
          expectedChainId,
          expectedNetworkLabel,
        }),
        expectedNetworkLabel,
        isOnExpectedAppchain,
        isOnSupportedChain: isOnExpectedAppchain,
        chain: agentCommerceAppchain,
        contracts: agentCommerceConfig.contracts,
        apiBaseUrl: agentCommerceConfig.apiBaseUrl,
        config: agentCommerceConfig,
        networkMessage: getAppchainNetworkMessage({
          isConfigured,
          configDescription: agentCommerceConfig.status.description,
          currentChainId,
          expectedChainId,
          expectedNetworkLabel,
          isConnected: account.isConnected,
          isConnecting: account.isConnecting,
          isOnExpectedAppchain,
        }),
      }
    },
    [account.isConnected, account.isConnecting, chainId],
  )
}
