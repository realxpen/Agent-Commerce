import type { AgentPricingModel } from "@/lib/api/types"
import type { ContractAddress } from "@/lib/contracts/types"

export const createAgentCategories = [
  "Content",
  "Data",
  "Support",
  "Code",
  "Marketing",
  "Finance",
] as const

export type CreateAgentFormValues = {
  name: string
  username: string
  bio: string
  category: string
  pricingModel: AgentPricingModel
  defaultPrice: string
  payoutAddress: string
}

export type CreateAgentFieldErrors = Partial<
  Record<keyof CreateAgentFormValues, string>
>

export type CreateAgentSubmission = {
  name: string
  initUsername: string | undefined
  description: string
  category: string
  pricingModel: AgentPricingModel
  treasuryAddress: ContractAddress
  defaultPrice: string
}

export const initialCreateAgentFormValues: CreateAgentFormValues = {
  name: "",
  username: "",
  bio: "",
  category: "Content",
  pricingModel: "FIXED_PRICE",
  defaultPrice: "50",
  payoutAddress: "",
}

const addressPattern = /^0x[a-fA-F0-9]{40}$/
const pricePattern = /^\d+(\.\d+)?$/

function normalizeText(value: string) {
  return value.trim()
}

function normalizeUsername(value: string) {
  return normalizeText(value).replace(/^@+/, "")
}

function validateName(value: string) {
  const normalized = normalizeText(value)

  if (normalized.length < 2) {
    return "Give your agent a name with at least 2 characters."
  }

  if (normalized.length > 120) {
    return "Keep the agent name under 120 characters."
  }

  return null
}

function validateUsername(value: string) {
  const normalized = normalizeUsername(value)

  if (!normalized) {
    return null
  }

  if (normalized.length < 2) {
    return "Username handles should be at least 2 characters."
  }

  if (normalized.length > 64) {
    return "Keep the username under 64 characters."
  }

  if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
    return "Use only letters, numbers, and underscores in the username."
  }

  return null
}

function validateBio(value: string) {
  const normalized = normalizeText(value)

  if (normalized.length < 10) {
    return "Add a short bio so buyers understand what this agent does."
  }

  if (normalized.length > 4000) {
    return "Keep the bio under 4000 characters."
  }

  return null
}

function validateCategory(value: string) {
  const normalized = normalizeText(value)

  if (normalized.length < 2) {
    return "Choose a category for your agent."
  }

  return null
}

function validateDefaultPrice(value: string) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return "Set a default service price for your first listing."
  }

  if (!pricePattern.test(normalized) || Number(normalized) <= 0) {
    return "Use a valid price greater than zero."
  }

  return null
}

function validatePayoutAddress(
  value: string,
  walletFallback?: string | null,
) {
  const normalized = normalizeText(value) || normalizeText(walletFallback ?? "")

  if (!normalized) {
    return "Connect a wallet or enter a treasury address for payouts."
  }

  if (!addressPattern.test(normalized)) {
    return "Enter a valid EVM wallet address for payouts."
  }

  return null
}

export function validateCreateAgentForm(
  values: CreateAgentFormValues,
  options: {
    walletTreasuryAddress?: string | null
  } = {},
) {
  const errors: CreateAgentFieldErrors = {}

  const nameError = validateName(values.name)
  if (nameError) {
    errors.name = nameError
  }

  const usernameError = validateUsername(values.username)
  if (usernameError) {
    errors.username = usernameError
  }

  const bioError = validateBio(values.bio)
  if (bioError) {
    errors.bio = bioError
  }

  const categoryError = validateCategory(values.category)
  if (categoryError) {
    errors.category = categoryError
  }

  const priceError = validateDefaultPrice(values.defaultPrice)
  if (priceError) {
    errors.defaultPrice = priceError
  }

  const payoutError = validatePayoutAddress(
    values.payoutAddress,
    options.walletTreasuryAddress,
  )
  if (payoutError) {
    errors.payoutAddress = payoutError
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false as const,
      errors,
    }
  }

  const treasuryAddress = (
    normalizeText(values.payoutAddress) ||
    normalizeText(options.walletTreasuryAddress ?? "")
  ) as ContractAddress
  const initUsername = normalizeUsername(values.username) || undefined

  return {
    success: true as const,
    data: {
      name: normalizeText(values.name),
      initUsername,
      description: normalizeText(values.bio),
      category: normalizeText(values.category),
      pricingModel: values.pricingModel,
      treasuryAddress,
      defaultPrice: normalizeText(values.defaultPrice),
    } satisfies CreateAgentSubmission,
  }
}

const stepFields: Record<number, Array<keyof CreateAgentFormValues>> = {
  0: ["name", "username", "bio"],
  1: ["category"],
  2: ["pricingModel", "defaultPrice"],
  3: ["payoutAddress"],
  4: [
    "name",
    "username",
    "bio",
    "category",
    "pricingModel",
    "defaultPrice",
    "payoutAddress",
  ],
}

export function validateCreateAgentStep(
  values: CreateAgentFormValues,
  stepIndex: number,
  options: {
    walletTreasuryAddress?: string | null
  } = {},
) {
  const result = validateCreateAgentForm(values, options)

  if (result.success) {
    return {
      success: true as const,
      errors: {} as CreateAgentFieldErrors,
    }
  }

  const errors: CreateAgentFieldErrors = {}

  for (const field of stepFields[stepIndex] ?? []) {
    if (result.errors[field]) {
      errors[field] = result.errors[field]
    }
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
  }
}
