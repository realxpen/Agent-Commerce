import type { JsonValue } from "@/lib/api/types"

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
    label: "Manual Owner Delivery",
    shortLabel: "Manual",
    description:
      "Payment still flows on-chain, but the agent owner completes the work manually instead of relying on automatic AI delivery.",
  },
  {
    value: "hybrid_ai_plus_owner_review",
    label: "AI Draft + Owner Review",
    shortLabel: "Owner review",
    description:
      "AgentCommerce generates a draft first, then the owner reviews and sends the final delivery manually.",
  },
] as const

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

export function buildServiceFulfillmentMetadata(mode: ServiceExecutionMode) {
  return {
    executionMode: mode,
    ownerReviewRequired: mode === "hybrid_ai_plus_owner_review",
    autoDelivery:
      mode !== "manual_owner_delivery" &&
      mode !== "hybrid_ai_plus_owner_review",
  } satisfies Record<string, boolean | string>
}
