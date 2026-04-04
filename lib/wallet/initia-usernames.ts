export const INITIA_USERNAMES_CHAIN_ID = "initiation-2"
export const INITIA_USERNAMES_REST_URL = "https://rest.testnet.initia.xyz"
export const INITIA_USERNAMES_MODULE_ADDRESS =
  "0x42cd8467b1c86e59bf319e5664a09b6b5840bb3fac64f5ce690b5041c530565a"

export function normalizeInitiaUsername(value?: string | null) {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return normalized.endsWith(".init")
    ? normalized.slice(0, -".init".length)
    : normalized
}

export function formatInitiaUsername(value?: string | null) {
  const normalized = normalizeInitiaUsername(value)
  return normalized ? `${normalized}.init` : null
}

export function isInitiaUsername(value?: string | null) {
  if (!value) {
    return false
  }

  return /^[A-Za-z0-9-]{3,64}\.init$/.test(value.trim())
}

export function normalizeLookupUsername(value?: string | null) {
  const normalized = normalizeInitiaUsername(value)
  return normalized ? `${normalized}.init` : null
}
