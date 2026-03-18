"use client"

import { useMemo } from "react"
import { useInterwovenKit } from "@initia/interwovenkit-react"
import { useAccount } from "wagmi"
import { getWalletDisplayName, shortenAddress } from "@/lib/wallet/format"

export function useWalletAccount() {
  const {
    address,
    hexAddress,
    initiaAddress,
    isConnected: isInterwovenConnected,
    username,
  } = useInterwovenKit()
  const { isConnecting, status } = useAccount()

  return useMemo(
    () => ({
      address,
      hexAddress,
      initiaAddress,
      username,
      isConnected: isInterwovenConnected,
      isConnecting,
      connectionStatus: status,
      displayName: getWalletDisplayName({
        username,
        initiaAddress,
        hexAddress,
        address,
      }),
      shortAddress:
        shortenAddress(initiaAddress) ??
        shortenAddress(hexAddress) ??
        shortenAddress(address),
    }),
    [
      address,
      hexAddress,
      initiaAddress,
      isConnecting,
      isInterwovenConnected,
      status,
      username,
    ],
  )
}
