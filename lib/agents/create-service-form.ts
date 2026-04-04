import { agentCommerceConfig } from "@/lib/appchain/config"
import {
  SERVICE_DELIVERABLE_TYPES,
  type ServiceDeliverableType,
} from "@/lib/services/deliverable-profile"
import {
  SERVICE_EXECUTION_MODES,
  isExecutionModeSupportedForDeliverable,
  type ServiceExecutionMode,
} from "@/lib/services/execution-mode"
import { isServiceDeliverableAiCreatable } from "@/lib/services/deliverable-profile"
import { findWorkingServicePresetByTitle } from "@/lib/services/presets"

export type CreateServiceFormValues = {
  agentId: string
  title: string
  description: string
  coverImageUrl: string
  priceAmount: string
  estimatedDeliveryMinutes: string
  executionMode: ServiceExecutionMode
  deliverableType: ServiceDeliverableType
}

export type CreateServiceFieldErrors = Partial<
  Record<keyof CreateServiceFormValues, string>
>

export type CreateServiceSubmission = {
  agentId: string
  title: string
  description: string
  coverImageUrl: string | null
  priceAmount: string
  estimatedDeliveryMinutes: number | null
  payableAmount: bigint
  executionMode: ServiceExecutionMode
  deliverableType: ServiceDeliverableType
}

export const initialCreateServiceFormValues: CreateServiceFormValues = {
  agentId: "",
  title: "",
  description: "",
  coverImageUrl: "",
  priceAmount: "",
  estimatedDeliveryMinutes: "60",
  executionMode: "text_delivery",
  deliverableType: "document",
}

const pricePattern = /^\d+(\.\d+)?$/

function normalizeText(value: string) {
  return value.trim()
}

function parseDecimalToBaseUnits(value: string, decimals: number) {
  const normalized = normalizeText(value)

  if (!pricePattern.test(normalized)) {
    return null
  }

  const [whole, fraction = ""] = normalized.split(".")
  const paddedFraction = `${fraction}${"0".repeat(decimals)}`.slice(0, decimals)

  return BigInt(`${whole}${paddedFraction}`)
}

export function validateCreateServiceForm(values: CreateServiceFormValues) {
  const errors: CreateServiceFieldErrors = {}
  const normalizedTitle = normalizeText(values.title)
  const matchedPreset =
    normalizedTitle.length >= 3
      ? findWorkingServicePresetByTitle(normalizedTitle)
      : null

  if (!normalizeText(values.agentId)) {
    errors.agentId = "Choose which agent should offer this service."
  }

  if (normalizedTitle.length < 3) {
    errors.title = "Give the service a clear title with at least 3 characters."
  } else if (!matchedPreset) {
    errors.title =
      "Choose one of the verified working preset services before publishing."
  }

  if (normalizeText(values.description).length < 10) {
    errors.description = "Add a short description so customers know what they will receive."
  }

  const normalizedCoverImageUrl = normalizeText(values.coverImageUrl)
  if (
    normalizedCoverImageUrl &&
    !/^https?:\/\//i.test(normalizedCoverImageUrl)
  ) {
    errors.coverImageUrl = "Use a full http(s) image URL for the marketplace cover."
  }

  const normalizedPrice = normalizeText(values.priceAmount)
  if (!normalizedPrice) {
    errors.priceAmount = "Set a price for this service."
  } else if (!pricePattern.test(normalizedPrice) || Number(normalizedPrice) <= 0) {
    errors.priceAmount = "Use a valid price greater than zero."
  }

  const normalizedDelivery = normalizeText(values.estimatedDeliveryMinutes)
  if (normalizedDelivery) {
    const deliveryMinutes = Number(normalizedDelivery)
    if (!Number.isInteger(deliveryMinutes) || deliveryMinutes <= 0) {
      errors.estimatedDeliveryMinutes =
        "Estimated delivery should be a whole number of minutes."
    }
  }

  if (!SERVICE_EXECUTION_MODES.includes(values.executionMode)) {
    errors.executionMode = "Choose how this service should be fulfilled."
  }

  if (!SERVICE_DELIVERABLE_TYPES.includes(values.deliverableType)) {
    errors.deliverableType = "Choose the expected deliverable format for this service."
  } else if (
    matchedPreset &&
    values.deliverableType !== matchedPreset.deliverableType
  ) {
    errors.deliverableType =
      "This preset keeps its verified deliverable type so it stays working end to end."
  } else if (!isServiceDeliverableAiCreatable(values.deliverableType)) {
    errors.deliverableType =
      "This deliverable type is preview-ready, but its full AI generation runner is not live yet."
  } else if (
    matchedPreset &&
    values.executionMode !== matchedPreset.executionMode
  ) {
    errors.executionMode =
      "This preset keeps its verified fulfillment mode so it stays working end to end."
  } else if (
    values.executionMode === "manual_owner_delivery" ||
    !isExecutionModeSupportedForDeliverable(
      values.executionMode,
      values.deliverableType,
    )
  ) {
    errors.executionMode =
      "Choose an AI fulfillment mode that matches this deliverable type."
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false as const,
      errors,
    }
  }

  const payableAmount = parseDecimalToBaseUnits(
    normalizedPrice,
    agentCommerceConfig.appchain.nativeCurrency.decimals,
  )

  if (payableAmount === null || payableAmount <= 0n) {
    return {
      success: false as const,
      errors: {
        priceAmount: "The price could not be converted into on-chain base units.",
      } satisfies CreateServiceFieldErrors,
    }
  }

  return {
    success: true as const,
    data: {
      agentId: normalizeText(values.agentId),
      title: normalizeText(values.title),
      description: normalizeText(values.description),
      coverImageUrl: normalizedCoverImageUrl || null,
      priceAmount: normalizedPrice,
      estimatedDeliveryMinutes: normalizedDelivery
        ? Number(normalizedDelivery)
        : null,
      payableAmount,
      executionMode: values.executionMode,
      deliverableType: values.deliverableType,
    } satisfies CreateServiceSubmission,
  }
}
