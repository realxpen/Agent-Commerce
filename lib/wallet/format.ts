export type WalletUiState =
  | "configuration"
  | "disconnected"
  | "connecting"
  | "connected"
  | "unsupported"
  | "error"

export type WalletErrorCode =
  | "CONFIGURATION_ERROR"
  | "USER_REJECTED"
  | "PROVIDER_NOT_READY"
  | "WALLET_NOT_CONNECTED"
  | "WRONG_NETWORK"
  | "UNKNOWN"

export type NormalizedWalletError = {
  code: WalletErrorCode
  title: string
  message: string
  details?: string
}

export function shortenAddress(
  address?: string | null,
  start = 6,
  end = 4,
) {
  if (!address) {
    return null
  }

  if (address.length <= start + end + 3) {
    return address
  }

  return `${address.slice(0, start)}...${address.slice(-end)}`
}

export function getWalletDisplayName(options: {
  username?: string | null
  initiaAddress?: string | null
  hexAddress?: string | null
  address?: string | null
}) {
  const { username, initiaAddress, hexAddress, address } = options

  if (username) {
    return username
  }

  return (
    shortenAddress(initiaAddress) ??
    shortenAddress(hexAddress) ??
    shortenAddress(address) ??
    "Wallet"
  )
}

export function getWalletUiState(options: {
  isConfigured?: boolean
  isConnected: boolean
  isConnecting: boolean
  isOnSupportedChain: boolean
  hasError?: boolean
}): WalletUiState {
  const {
    hasError,
    isConfigured = true,
    isConnected,
    isConnecting,
    isOnSupportedChain,
  } = options

  if (!isConfigured) {
    return "configuration"
  }

  if (isConnecting) {
    return "connecting"
  }

  if (hasError) {
    return "error"
  }

  if (!isConnected) {
    return "disconnected"
  }

  if (!isOnSupportedChain) {
    return "unsupported"
  }

  return "connected"
}

export function getWalletStatusLabel(state: WalletUiState) {
  switch (state) {
    case "configuration":
      return "Setup Required"
    case "connecting":
      return "Connecting"
    case "connected":
      return "Connected"
    case "unsupported":
      return "Wrong Network"
    case "error":
      return "Action Needed"
    default:
      return "Not Connected"
  }
}

export function getWalletStatusDescription(state: WalletUiState) {
  switch (state) {
    case "configuration":
      return "Finish the appchain setup before using wallet actions."
    case "connecting":
      return "Waiting for wallet approval."
    case "connected":
      return "Ready for payments and appchain actions."
    case "unsupported":
      return "Switch to your AgentCommerce appchain wallet session."
    case "error":
      return "We hit a wallet issue. Try again in a moment."
    default:
      return "Connect to continue with orders and agent actions."
  }
}

export function normalizeWalletError(error: unknown): NormalizedWalletError {
  const rawMessage = error instanceof Error ? error.message : "Unknown wallet error"
  const message = rawMessage.toLowerCase()

  if (
    message.includes("frontend setup incomplete") ||
    message.includes("missing appchain configuration") ||
    message.includes("missing wallet configuration")
  ) {
    return {
      code: "CONFIGURATION_ERROR",
      title: "Frontend setup incomplete",
      message:
        "Add the appchain environment variables before trying to connect a wallet.",
      details: rawMessage,
    }
  }

  if (
    message.includes("user rejected") ||
    message.includes("rejected") ||
    message.includes("cancelled") ||
    message.includes("canceled")
  ) {
    return {
      code: "USER_REJECTED",
      title: "Wallet request cancelled",
      message: "The wallet step was cancelled before it finished.",
      details: rawMessage,
    }
  }

  if (
    message.includes("wrong network") ||
    message.includes("switch network") ||
    message.includes("unsupported chain")
  ) {
    return {
      code: "WRONG_NETWORK",
      title: "Wrong network",
      message:
        "Switch to the AgentCommerce appchain in your wallet, then try again.",
      details: rawMessage,
    }
  }

  if (
    message.includes("wallet not connected") ||
    message.includes("account not found")
  ) {
    return {
      code: "WALLET_NOT_CONNECTED",
      title: "Wallet not connected",
      message: "Connect your wallet first, then try again.",
      details: rawMessage,
    }
  }

  if (
    message.includes("provider is mounted") ||
    message.includes("provider") ||
    message.includes("connector")
  ) {
    return {
      code: "PROVIDER_NOT_READY",
      title: "Wallet still getting ready",
      message:
        "Your wallet provider is still warming up. Give it a moment and retry.",
      details: rawMessage,
    }
  }

  return {
    code: "UNKNOWN",
    title: "Wallet action failed",
    message: "We couldn't complete the wallet action. Please try again.",
    details: rawMessage,
  }
}

export function mapWalletError(error: unknown) {
  return normalizeWalletError(error).message
}
