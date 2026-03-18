import { BaseError } from "wagmi"
import type { NormalizedContractError } from "@/lib/contracts/types"

function getRawErrorMessage(error: unknown) {
  if (error instanceof BaseError) {
    return error.shortMessage || error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unknown wallet error"
}

export function normalizeContractError(
  error: unknown,
): NormalizedContractError {
  const rawMessage = getRawErrorMessage(error)
  const message = rawMessage.toLowerCase()

  if (
    message.includes("frontend setup incomplete") ||
    message.includes("missing contract configuration") ||
    message.includes("missing appchain configuration")
  ) {
    return {
      code: "CONFIGURATION_ERROR",
      title: "Frontend setup incomplete",
      message:
        "Add the appchain and contract environment variables before sending live transactions.",
      details: rawMessage,
    }
  }

  if (
    message.includes("user rejected") ||
    message.includes("rejected the request") ||
    message.includes("user denied") ||
    message.includes("cancelled") ||
    message.includes("canceled")
  ) {
    return {
      code: "USER_REJECTED",
      title: "Request cancelled",
      message: "The wallet request was cancelled before it was completed.",
      details: rawMessage,
    }
  }

  if (
    message.includes("insufficient funds") ||
    message.includes("gas required exceeds allowance")
  ) {
    return {
      code: "INSUFFICIENT_FUNDS",
      title: "Not enough balance",
      message:
        "Your wallet does not have enough balance to cover this transaction right now.",
      details: rawMessage,
    }
  }

  if (
    message.includes("chain mismatch") ||
    message.includes("unsupported chain") ||
    message.includes("switch network") ||
    message.includes("wrong network") ||
    message.includes("chain not configured")
  ) {
    return {
      code: "WRONG_NETWORK",
      title: "Wrong network",
      message:
        "Switch your wallet to the AgentCommerce appchain and try the transaction again.",
      details: rawMessage,
    }
  }

  if (
    message.includes("connector not connected") ||
    message.includes("wallet not connected") ||
    message.includes("account not found")
  ) {
    return {
      code: "WALLET_NOT_CONNECTED",
      title: "Wallet not ready",
      message:
        "Connect your wallet first, then retry the transaction when your account is ready.",
      details: rawMessage,
    }
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network request failed") ||
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("econnrefused") ||
    message.includes("socket hang up")
  ) {
    return {
      code: "NETWORK_ERROR",
      title: "Appchain connection issue",
      message:
        "We could not reach the appchain cleanly. Check the RPC connection and try again.",
      details: rawMessage,
    }
  }

  if (
    message.includes("execution reverted") ||
    message.includes("reverted") ||
    message.includes("contractfunctionexecutionerror")
  ) {
    return {
      code: "CONTRACT_REVERTED",
      title: "Transaction could not be completed",
      message:
        "The contract rejected this action. Double-check the order, service, or wallet permissions and try again.",
      details: rawMessage,
    }
  }

  return {
    code: "UNKNOWN",
    title: "Transaction failed",
    message:
      "Something went wrong while talking to the appchain. Please try again in a moment.",
    details: rawMessage,
  }
}
