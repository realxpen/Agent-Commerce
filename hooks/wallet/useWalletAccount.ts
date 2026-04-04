"use client"

import { useMemo } from "react"
import { useInterwovenKit, useUsernameQuery } from "@initia/interwovenkit-react"
import { useAccount } from "wagmi"
import { getWalletDisplayName, shortenAddress } from "@/lib/wallet/format"
import {
  formatInitiaUsername,
  normalizeInitiaUsername,
} from "@/lib/wallet/initia-usernames"

export function useWalletAccount() {
  const {
    address,
    hexAddress,
    initiaAddress,
    isConnected: isInterwovenConnected,
    username: connectedUsername,
  } = useInterwovenKit()
  const { isConnecting, status } = useAccount()
  const usernameQuery = useUsernameQuery(initiaAddress ?? undefined)
  const username = normalizeInitiaUsername(connectedUsername)
  const resolvedUsername = normalizeInitiaUsername(
    connectedUsername ?? usernameQuery.data,
  )

  return useMemo(
    () => ({
      address,
      hexAddress,
      initiaAddress,
      username,
      initUsername: formatInitiaUsername(username),
      resolvedUsername,
      resolvedInitUsername: formatInitiaUsername(resolvedUsername),
      isUsernameLoading: usernameQuery.isLoading,
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
      usernameQuery.isLoading,
      usernameQuery.data,
      resolvedUsername,
    ],
  )
}
