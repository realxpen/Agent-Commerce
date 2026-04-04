import type { JsonValue } from "@/lib/api/types"
import {
  getServiceDeliverableDefinition,
  isServiceDeliverableAiCreatable,
  type ServiceDeliverableType,
} from "@/lib/services/deliverable-profile"

export const SERVICE_EXECUTION_MODES = [
  "text_delivery",
  "research_with_links",
  "file_generation",
  "manual_owner_delivery",
  "hybrid_ai_plus_owner_review",
] as const

export type ServiceExecutionMode = (typeof SERVICE_EXECUTION_MODES)[number]

export type ServiceExecutionModeDefinition = {
  value: ServiceExecutionMode
  label: string
  shortLabel: string
  description: string
}

export const serviceExecutionModeDefinitions: readonly ServiceExecutionModeDefinition[] = [
  {
    value: "text_delivery",
    label: "AI Text Delivery",
    shortLabel: "Auto AI",
    description:
      "AgentCommerce generates the delivery automatically and sends it straight to the customer when the task succeeds.",
  },
  {
    value: "research_with_links",
    label: "AI Research With Links",
    shortLabel: "Research",
    description:
      "The task focuses on research-style output and organizes the result around the client brief and provided references.",
  },
  {
    value: "file_generation",
    label: "AI File Generation",
    shortLabel: "Files",
    description:
      "The task prepares export-ready text or structured content that can be handed off as a document-style deliverable.",
  },
  {
    value: "manual_owner_delivery",
    label: "Manual Owner Delivery (Legacy)",
    shortLabel: "Legacy",
    description:
      "This older mode keeps the final creation step with the owner. New AI-first services should use an automated mode instead.",
  },
  {
    value: "hybrid_ai_plus_owner_review",
    label: "AI Draft + Owner Review",
    shortLabel: "Owner review",
    description:
      "AgentCommerce generates a draft first, then the owner reviews and sends the final delivery manually.",
  },
] as const

export function getSupportedCreationExecutionModes(
  deliverableType: ServiceDeliverableType,
) {
  if (!isServiceDeliverableAiCreatable(deliverableType)) {
    return [] as ServiceExecutionMode[]
  }

  if (deliverableType === "design") {
    return ["hybrid_ai_plus_owner_review", "file_generation"] as ServiceExecutionMode[]
  }

  if (deliverableType === "document") {
    return [
      "text_delivery",
      "research_with_links",
      "file_generation",
      "hybrid_ai_plus_owner_review",
    ] as ServiceExecutionMode[]
  }

  return ["file_generation", "hybrid_ai_plus_owner_review"] as ServiceExecutionMode[]
}

export function getSupportedCreationExecutionModeDefinitions(
  deliverableType: ServiceDeliverableType,
) {
  const allowedModes = getSupportedCreationExecutionModes(deliverableType)
  return serviceExecutionModeDefinitions.filter(
    (definition) =>
      definition.value !== "manual_owner_delivery" &&
      allowedModes.includes(definition.value),
  )
}

export function isExecutionModeSupportedForDeliverable(
  mode: ServiceExecutionMode,
  deliverableType: ServiceDeliverableType,
) {
  return getSupportedCreationExecutionModes(deliverableType).includes(mode)
}

function isRecord(value: JsonValue | Record<string, unknown> | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isExecutionMode(value: unknown): value is ServiceExecutionMode {
  return typeof value === "string" && SERVICE_EXECUTION_MODES.includes(value as ServiceExecutionMode)
}

export function getServiceExecutionMode(metadata: JsonValue | Record<string, unknown> | null | undefined) {
  const record = isRecord(metadata)
  const fulfillment = isRecord(record?.fulfillment as JsonValue | Record<string, unknown> | null | undefined)
  const value = fulfillment?.executionMode

  return isExecutionMode(value) ? value : "text_delivery"
}

export function getServiceExecutionModeDefinition(mode: ServiceExecutionMode) {
  return (
    serviceExecutionModeDefinitions.find((definition) => definition.value === mode) ??
    serviceExecutionModeDefinitions[0]
  )
}

export function buildServiceFulfillmentMetadata(
  mode: ServiceExecutionMode,
  deliverableType: ServiceDeliverableType,
) {
  const deliverableDefinition = getServiceDeliverableDefinition(deliverableType)

  return {
    executionMode: mode,
    ownerReviewRequired: mode === "hybrid_ai_plus_owner_review",
    autoDelivery:
      mode !== "manual_owner_delivery" &&
      mode !== "hybrid_ai_plus_owner_review",
    deliverableType,
    deliverableLabel: deliverableDefinition.label,
    deliverableAutomation: deliverableDefinition.automationLevel,
  } satisfies Record<string, boolean | string>
}
