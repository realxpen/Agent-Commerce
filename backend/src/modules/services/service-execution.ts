import {
  getServiceDeliverableTypeFromMetadata,
  getServiceDeliverableTypeFromServiceSnapshot,
  getServiceDeliverableTypeFromTaskInput,
  type ServiceDeliverableType,
} from "./service-deliverables.js";

export const SERVICE_EXECUTION_MODES = [
  "text_delivery",
  "research_with_links",
  "file_generation",
  "manual_owner_delivery",
  "hybrid_ai_plus_owner_review",
] as const;

export type ServiceExecutionMode = (typeof SERVICE_EXECUTION_MODES)[number];

export type ServiceExecutionContext = {
  mode: ServiceExecutionMode;
  deliverableType: ServiceDeliverableType;
  ownerReviewRequired: boolean;
  autoDelivery: boolean;
  usesLlm: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isExecutionMode(value: unknown): value is ServiceExecutionMode {
  return typeof value === "string" && SERVICE_EXECUTION_MODES.includes(value as ServiceExecutionMode);
}

export function getServiceExecutionModeFromMetadata(metadata: unknown): ServiceExecutionMode {
  if (!isRecord(metadata)) {
    return "text_delivery";
  }

  const fulfillment = isRecord(metadata.fulfillment) ? metadata.fulfillment : null;
  const executionMode = fulfillment?.executionMode;

  return isExecutionMode(executionMode) ? executionMode : "text_delivery";
}

export function getServiceExecutionModeFromServiceSnapshot(serviceSnapshot: unknown): ServiceExecutionMode {
  if (!isRecord(serviceSnapshot)) {
    return "text_delivery";
  }

  return getServiceExecutionModeFromMetadata(serviceSnapshot.metadata);
}

export function getServiceExecutionModeFromTaskInput(input: unknown): ServiceExecutionMode {
  if (isRecord(input)) {
    const execution = isRecord(input.execution) ? input.execution : null;
    if (execution && isExecutionMode(execution.mode)) {
      return execution.mode;
    }

    if (isRecord(input.serviceSnapshot)) {
      return getServiceExecutionModeFromServiceSnapshot(input.serviceSnapshot);
    }
  }

  return "text_delivery";
}

export function getServiceExecutionContext(mode: ServiceExecutionMode): ServiceExecutionContext {
  return {
    mode,
    deliverableType: "document",
    ownerReviewRequired: mode === "hybrid_ai_plus_owner_review",
    autoDelivery:
      mode !== "manual_owner_delivery" &&
      mode !== "hybrid_ai_plus_owner_review",
    usesLlm: mode !== "manual_owner_delivery",
  };
}

export function getServiceExecutionContextFromMetadata(metadata: unknown) {
  const mode = getServiceExecutionModeFromMetadata(metadata);
  return {
    ...getServiceExecutionContext(mode),
    deliverableType: getServiceDeliverableTypeFromMetadata(metadata),
  };
}

export function getServiceExecutionContextFromServiceSnapshot(serviceSnapshot: unknown) {
  return {
    ...getServiceExecutionContext(
      getServiceExecutionModeFromServiceSnapshot(serviceSnapshot),
    ),
    deliverableType: getServiceDeliverableTypeFromServiceSnapshot(serviceSnapshot),
  };
}

export function getServiceExecutionContextFromTaskInput(input: unknown) {
  return {
    ...getServiceExecutionContext(getServiceExecutionModeFromTaskInput(input)),
    deliverableType: getServiceDeliverableTypeFromTaskInput(input),
  };
}
