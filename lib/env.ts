type HexAddress = `0x${string}`

type PublicEnvIssue = {
  name: string
  message: string
}

type PublicEnvStatus = {
  isConfigured: boolean
  walletReady: boolean
  contractsReady: boolean
  apiReady: boolean
  missingKeys: string[]
  invalidKeys: string[]
  issues: PublicEnvIssue[]
}

type PublicEnv = {
  appchainJsonRpcUrl: string
  appchainRpcUrl: string
  appchainRestUrl: string
  appchainIndexerUrl: string
  appchainChainId: string
  appchainInterwovenChainId: string
  appchainEvmChainId: number
  appchainDisplayName: string
  agentRegistryAddress: HexAddress
  serviceEscrowAddress: HexAddress
  apiBaseUrl: string
  status: PublicEnvStatus
}

let cachedPublicEnv: PublicEnv | null = null

const FALLBACK_JSON_RPC_URL = "http://127.0.0.1:8545"
const FALLBACK_RPC_URL = "http://127.0.0.1:26657"
const FALLBACK_REST_URL = "http://127.0.0.1:1317"
const FALLBACK_INDEXER_URL = "http://127.0.0.1:8080"
const FALLBACK_CHAIN_ID = 4273954181916632
const FALLBACK_INTERWOVEN_CHAIN_ID = "agentcommerce-1"
const FALLBACK_DISPLAY_NAME = "AgentCommerce"
const FALLBACK_CONTRACT_ADDRESS =
  "0x0000000000000000000000000000000000000000" as HexAddress
const FALLBACK_API_BASE_URL = "http://127.0.0.1:4000"

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function replaceUrlPort(url: string, port: string) {
  try {
    const nextUrl = new URL(url)
    nextUrl.port = port
    return trimTrailingSlash(nextUrl.toString())
  } catch {
    return trimTrailingSlash(url)
  }
}

function readEnvString(
  name: string,
  value: string | undefined,
  fallback: string,
  issues: PublicEnvIssue[],
  buckets: { missingKeys: string[]; invalidKeys: string[] },
) {
  const trimmed = value?.trim()

  if (!trimmed) {
    issues.push({
      name,
      message: `${name} is missing.`,
    })
    buckets.missingKeys.push(name)
    return fallback
  }

  return trimmed
}

function parseNumericChainId(
  rawChainId: string,
  issues: PublicEnvIssue[],
  buckets: { missingKeys: string[]; invalidKeys: string[] },
): number {
  const parsed = Number.parseInt(rawChainId, 10)

  if (!Number.isFinite(parsed)) {
    issues.push({
      name: "NEXT_PUBLIC_APPCHAIN_CHAIN_ID",
      message:
        "NEXT_PUBLIC_APPCHAIN_CHAIN_ID must be a numeric EVM chain id for the wallet provider setup.",
    })
    buckets.invalidKeys.push("NEXT_PUBLIC_APPCHAIN_CHAIN_ID")
    return FALLBACK_CHAIN_ID
  }

  return parsed
}

function readHexAddress(
  name: string,
  value: string | undefined,
  issues: PublicEnvIssue[],
  buckets: { missingKeys: string[]; invalidKeys: string[] },
): HexAddress {
  const candidate = readEnvString(
    name,
    value,
    FALLBACK_CONTRACT_ADDRESS,
    issues,
    buckets,
  )

  if (/^0x[a-fA-F0-9]{40}$/.test(candidate)) {
    return candidate as HexAddress
  }

  if (candidate !== FALLBACK_CONTRACT_ADDRESS) {
    issues.push({
      name,
      message: `${name} must be a valid 0x-prefixed EVM contract address.`,
    })
    buckets.invalidKeys.push(name)
  }

  return FALLBACK_CONTRACT_ADDRESS
}

export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) {
    return cachedPublicEnv
  }

  const issues: PublicEnvIssue[] = []
  const buckets = {
    missingKeys: [] as string[],
    invalidKeys: [] as string[],
  }

  const appchainJsonRpcUrl = readEnvString(
    "NEXT_PUBLIC_APPCHAIN_RPC_URL",
    process.env.NEXT_PUBLIC_APPCHAIN_RPC_URL,
    FALLBACK_JSON_RPC_URL,
    issues,
    buckets,
  )
  const appchainRpcUrl = readEnvString(
    "NEXT_PUBLIC_APPCHAIN_TENDERMINT_RPC_URL",
    process.env.NEXT_PUBLIC_APPCHAIN_TENDERMINT_RPC_URL,
    replaceUrlPort(appchainJsonRpcUrl, "26657"),
    [],
    {
      missingKeys: [],
      invalidKeys: [],
    },
  )
  const appchainRestUrl = readEnvString(
    "NEXT_PUBLIC_APPCHAIN_REST_URL",
    process.env.NEXT_PUBLIC_APPCHAIN_REST_URL,
    replaceUrlPort(appchainJsonRpcUrl, "1317"),
    [],
    {
      missingKeys: [],
      invalidKeys: [],
    },
  )
  const appchainIndexerUrl = readEnvString(
    "NEXT_PUBLIC_APPCHAIN_INDEXER_URL",
    process.env.NEXT_PUBLIC_APPCHAIN_INDEXER_URL,
    replaceUrlPort(appchainJsonRpcUrl, "8080"),
    [],
    {
      missingKeys: [],
      invalidKeys: [],
    },
  )
  const appchainChainId = readEnvString(
    "NEXT_PUBLIC_APPCHAIN_CHAIN_ID",
    process.env.NEXT_PUBLIC_APPCHAIN_CHAIN_ID,
    String(FALLBACK_CHAIN_ID),
    issues,
    buckets,
  )
  const appchainInterwovenChainId = readEnvString(
    "NEXT_PUBLIC_APPCHAIN_INTERWOVEN_CHAIN_ID",
    process.env.NEXT_PUBLIC_APPCHAIN_INTERWOVEN_CHAIN_ID,
    FALLBACK_INTERWOVEN_CHAIN_ID,
    [],
    {
      missingKeys: [],
      invalidKeys: [],
    },
  )
  const appchainDisplayName = readEnvString(
    "NEXT_PUBLIC_APPCHAIN_DISPLAY_NAME",
    process.env.NEXT_PUBLIC_APPCHAIN_DISPLAY_NAME,
    FALLBACK_DISPLAY_NAME,
    [],
    {
      missingKeys: [],
      invalidKeys: [],
    },
  )
  const agentRegistryAddress = readHexAddress(
    "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS",
    process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS,
    issues,
    buckets,
  )
  const serviceEscrowAddress = readHexAddress(
    "NEXT_PUBLIC_SERVICE_ESCROW_ADDRESS",
    process.env.NEXT_PUBLIC_SERVICE_ESCROW_ADDRESS,
    issues,
    buckets,
  )
  const apiBaseUrl = readEnvString(
    "NEXT_PUBLIC_API_BASE_URL",
    process.env.NEXT_PUBLIC_API_BASE_URL,
    FALLBACK_API_BASE_URL,
    issues,
    buckets,
  )
  const appchainEvmChainId = parseNumericChainId(appchainChainId, issues, buckets)

  const walletReady =
    !buckets.missingKeys.includes("NEXT_PUBLIC_APPCHAIN_RPC_URL") &&
    !buckets.missingKeys.includes("NEXT_PUBLIC_APPCHAIN_CHAIN_ID") &&
    !buckets.invalidKeys.includes("NEXT_PUBLIC_APPCHAIN_CHAIN_ID")
  const contractsReady =
    !buckets.missingKeys.includes("NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS") &&
    !buckets.missingKeys.includes("NEXT_PUBLIC_SERVICE_ESCROW_ADDRESS") &&
    !buckets.invalidKeys.includes("NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS") &&
    !buckets.invalidKeys.includes("NEXT_PUBLIC_SERVICE_ESCROW_ADDRESS")
  const apiReady = !buckets.missingKeys.includes("NEXT_PUBLIC_API_BASE_URL")

  cachedPublicEnv = {
    appchainJsonRpcUrl,
    appchainRpcUrl,
    appchainRestUrl,
    appchainIndexerUrl,
    appchainChainId,
    appchainInterwovenChainId,
    appchainEvmChainId,
    appchainDisplayName,
    agentRegistryAddress,
    serviceEscrowAddress,
    apiBaseUrl,
    status: {
      isConfigured: walletReady && contractsReady && apiReady,
      walletReady,
      contractsReady,
      apiReady,
      missingKeys: buckets.missingKeys,
      invalidKeys: buckets.invalidKeys,
      issues,
    },
  }

  return cachedPublicEnv
}
