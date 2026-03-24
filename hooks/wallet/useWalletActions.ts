"use client"

import { useCallback } from "react"
import { useInterwovenKit } from "@initia/interwovenkit-react"
import { useDisconnect } from "wagmi"
import { agentCommerceConfig } from "@/lib/appchain/config"
import { switchToAgentCommerceAppchain } from "@/lib/appchain/wallet-network"

function assertWalletConfigReady() {
  if (!agentCommerceConfig.status.walletReady) {
    throw new Error(
      "Frontend setup incomplete: missing appchain configuration for wallet actions.",
    )
  }
}

export function useWalletActions() {
  const { openBridge, openConnect, openWallet } = useInterwovenKit()
  const { disconnect } = useDisconnect()

  return {
    connect: useCallback(() => {
      assertWalletConfigReady()
      openConnect()
    }, [openConnect]),
    openWallet: useCallback(() => {
      assertWalletConfigReady()
      openWallet()
    }, [openWallet]),
    openBridge: useCallback(() => {
      assertWalletConfigReady()
      openBridge()
    }, [openBridge]),
    switchNetwork: useCallback(async () => {
      assertWalletConfigReady()
      await switchToAgentCommerceAppchain()
    }, []),
    disconnect: useCallback(() => {
      disconnect()
    }, [disconnect]),
  }
}
