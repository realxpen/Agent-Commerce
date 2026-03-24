"use client"

import { agentCommerceConfig } from "@/lib/appchain/config"

type EthereumRequestArguments = {
  method: string
  params?: unknown[] | object
}

type EthereumProvider = {
  request: (args: EthereumRequestArguments) => Promise<unknown>
}

type EthereumProviderError = Error & {
  code?: number
}

function getInjectedEthereumProvider(): EthereumProvider {
  const provider =
    typeof window !== "undefined" ? (window.ethereum as EthereumProvider | undefined) : undefined

  if (!provider) {
    throw new Error(
      "No injected wallet provider was found. Install or unlock MetaMask, then try again.",
    )
  }

  return provider
}

function toWalletChainIdHex(chainId: number | string) {
  const chainValue =
    typeof chainId === "number" ? BigInt(chainId) : BigInt(chainId)

  return `0x${chainValue.toString(16)}`
}

function getWalletAddChainParams() {
  return {
    chainId: toWalletChainIdHex(agentCommerceConfig.appchain.chainId),
    chainName: agentCommerceConfig.appchain.displayName,
    nativeCurrency: agentCommerceConfig.appchain.nativeCurrency,
    rpcUrls: [agentCommerceConfig.appchain.rpcUrl],
  }
}

function isUnknownChainError(error: EthereumProviderError) {
  const message = error.message.toLowerCase()

  return (
    error.code === 4902 ||
    message.includes("unrecognized chain id") ||
    message.includes("unknown chain") ||
    message.includes("chain has not been added") ||
    message.includes("not added")
  )
}

function isPendingRequestError(error: EthereumProviderError) {
  const message = error.message.toLowerCase()

  return error.code === -32002 || message.includes("already pending")
}

export async function switchToAgentCommerceAppchain() {
  const provider = getInjectedEthereumProvider()
  const chainId = toWalletChainIdHex(agentCommerceConfig.appchain.chainId)

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    })
    return
  } catch (caughtError) {
    const error =
      caughtError instanceof Error
        ? (caughtError as EthereumProviderError)
        : new Error("Failed to switch wallet network")

    if (isPendingRequestError(error)) {
      throw new Error(
        "A wallet network request is already waiting in MetaMask. Open MetaMask, finish or dismiss it, then try again.",
      )
    }

    if (!isUnknownChainError(error)) {
      throw error
    }
  }

  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [getWalletAddChainParams()],
    })
  } catch (caughtError) {
    const error =
      caughtError instanceof Error
        ? (caughtError as EthereumProviderError)
        : new Error("Failed to add the AgentCommerce appchain to MetaMask")

    if (isPendingRequestError(error)) {
      throw new Error(
        "A wallet request is already waiting in MetaMask. Open MetaMask, finish or dismiss it, then try again.",
      )
    }

    throw error
  }

  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId }],
  })
}
