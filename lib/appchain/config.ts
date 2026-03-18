import {
  TESTNET,
  initiaPrivyWalletConnector,
} from "@initia/interwovenkit-react"
import { createConfig, http } from "wagmi"
import { getPublicEnv } from "@/lib/env"

type HexAddress = `0x${string}`

export type AgentCommerceNetworkMessage = {
  label: string
  title: string
  description: string
  actionLabel?: string
}

export type AgentCommerceConfigStatus = {
  isConfigured: boolean
  walletReady: boolean
  contractsReady: boolean
  apiReady: boolean
  missingKeys: string[]
  invalidKeys: string[]
  issues: Array<{
    name: string
    message: string
  }>
  title: string
  description: string
}

export type FrontendSafeAppchainConfig = {
  appName: string
  apiBaseUrl: string
  appchain: {
    displayName: string
    chainId: number
    interwovenChainId: string
    rpcUrl: string
    nativeCurrency: {
      name: string
      symbol: string
      decimals: number
    }
  }
  contracts: {
    agentRegistry: HexAddress
    serviceEscrow: HexAddress
  }
  status: AgentCommerceConfigStatus
}

export type AgentCommerceNetworkState =
  | "configuration-required"
  | "disconnected"
  | "connecting"
  | "wrong-network"
  | "ready"

const env = getPublicEnv()
const hasConfigIssues = env.status.issues.length > 0
const configDescription = hasConfigIssues
  ? `Finish the frontend setup before using live wallet and contract flows. Missing or invalid values: ${env.status.issues
      .map((issue) => issue.name)
      .join(", ")}.`
  : "Frontend setup is ready."

export const agentCommerceConfig: FrontendSafeAppchainConfig = {
  appName: "AgentCommerce",
  apiBaseUrl: env.apiBaseUrl,
  appchain: {
    displayName: "AgentCommerce Appchain",
    chainId: env.appchainEvmChainId,
    interwovenChainId: env.appchainChainId || TESTNET.defaultChainId,
    rpcUrl: env.appchainRpcUrl,
    // Replace these placeholders with your finalized appchain native token details.
    nativeCurrency: {
      name: "Appchain Native Token",
      symbol: "NATIVE",
      decimals: 18,
    },
  },
  contracts: {
    agentRegistry: env.agentRegistryAddress,
    serviceEscrow: env.serviceEscrowAddress,
  },
  status: {
    ...env.status,
    title: hasConfigIssues
      ? "Frontend setup incomplete"
      : "Frontend setup ready",
    description: configDescription,
  },
}

export const agentCommerceChain = {
  id: agentCommerceConfig.appchain.chainId,
  name: agentCommerceConfig.appchain.displayName,
  nativeCurrency: agentCommerceConfig.appchain.nativeCurrency,
  rpcUrls: {
    default: {
      http: [agentCommerceConfig.appchain.rpcUrl],
    },
    public: {
      http: [agentCommerceConfig.appchain.rpcUrl],
    },
  },
} as const

export const agentCommerceAppchain = agentCommerceChain
export const appchainContracts = agentCommerceConfig.contracts
export const appchainRegistryChainId =
  agentCommerceConfig.appchain.interwovenChainId

export const wagmiConfig = createConfig({
  connectors: [initiaPrivyWalletConnector],
  chains: [agentCommerceAppchain],
  transports: {
    [agentCommerceAppchain.id]: http(agentCommerceConfig.appchain.rpcUrl),
  },
})

export const interwovenKitConfig = {
  ...TESTNET,
  defaultChainId: agentCommerceConfig.appchain.interwovenChainId,
  theme: "dark" as const,
  disableAnalytics: true,
  enableAutoSign: true,
}

export function getAppchainNetworkState(options: {
  isConfigured: boolean
  isConnected: boolean
  isConnecting: boolean
  isOnExpectedAppchain: boolean
}): AgentCommerceNetworkState {
  const { isConfigured, isConnected, isConnecting, isOnExpectedAppchain } =
    options

  if (!isConfigured) {
    return "configuration-required"
  }

  if (isConnecting) {
    return "connecting"
  }

  if (!isConnected) {
    return "disconnected"
  }

  if (!isOnExpectedAppchain) {
    return "wrong-network"
  }

  return "ready"
}

export function formatCurrentNetworkLabel(options: {
  currentChainId: number | null
  expectedChainId: number
  expectedNetworkLabel: string
}) {
  const { currentChainId, expectedChainId, expectedNetworkLabel } = options

  if (currentChainId === null) {
    return "No wallet network detected"
  }

  if (currentChainId === expectedChainId) {
    return expectedNetworkLabel
  }

  return `Unsupported network (chain ${currentChainId})`
}

export function getAppchainNetworkMessage(options: {
  isConfigured: boolean
  configDescription?: string
  currentChainId: number | null
  expectedChainId: number
  expectedNetworkLabel: string
  isConnected: boolean
  isConnecting: boolean
  isOnExpectedAppchain: boolean
}): AgentCommerceNetworkMessage {
  const {
    currentChainId,
    expectedChainId,
    expectedNetworkLabel,
    isConfigured,
    configDescription,
    isConnected,
    isConnecting,
    isOnExpectedAppchain,
  } = options

  if (!isConfigured) {
    return {
      label: "Setup Required",
      title: "Finish the frontend setup",
      description:
        configDescription ??
        "Add the appchain and contract environment variables before using wallet actions.",
      actionLabel: "Update env",
    }
  }

  if (isConnecting) {
    return {
      label: "Connecting",
      title: "Connecting your wallet",
      description:
        "Finish the wallet approval to continue into AgentCommerce without extra setup steps.",
      actionLabel: "Approve in wallet",
    }
  }

  if (!isConnected) {
    return {
      label: "Not Connected",
      title: "Connect to continue",
      description:
        "Connect your wallet to create agents, pay for services, and manage orders while AgentCommerce handles the chain details in the background.",
      actionLabel: "Connect wallet",
    }
  }

  if (!isOnExpectedAppchain) {
    const currentNetworkLabel = formatCurrentNetworkLabel({
      currentChainId,
      expectedChainId,
      expectedNetworkLabel,
    })

    return {
      label: "Wrong Network",
      title: "Switch to the AgentCommerce appchain",
      description: `Your wallet is currently on ${currentNetworkLabel}. Switch to ${expectedNetworkLabel} (chain ${expectedChainId}) to continue with checkout, dashboard, and agent actions.`,
      actionLabel: "Switch network",
    }
  }

  return {
    label: "Appchain Ready",
    title: "Connected to the right appchain",
    description:
      "Your wallet is connected to the AgentCommerce appchain and ready for payments, agent creation, and order actions.",
    actionLabel: "Open wallet",
  }
}
