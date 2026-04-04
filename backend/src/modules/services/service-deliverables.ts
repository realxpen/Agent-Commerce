export const SERVICE_DELIVERABLE_TYPES = [
  "document",
  "code",
  "contract",
  "design",
  "data",
  "spreadsheet",
  "presentation",
  "model",
  "deployment",
  "weights",
  "video",
  "audio",
] as const;

export type ServiceDeliverableType = (typeof SERVICE_DELIVERABLE_TYPES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isServiceDeliverableType(value: unknown): value is ServiceDeliverableType {
  return (
    typeof value === "string" &&
    SERVICE_DELIVERABLE_TYPES.includes(value as ServiceDeliverableType)
  );
}

export function getServiceDeliverableTypeFromMetadata(
  metadata: unknown,
): ServiceDeliverableType {
  if (!isRecord(metadata)) {
    return "document";
  }

  const subject =
    !metadata.fulfillment && isRecord(metadata.metadata)
      ? metadata.metadata
      : metadata;
  const fulfillment = isRecord(subject.fulfillment) ? subject.fulfillment : null;
  const deliverableType = fulfillment?.deliverableType;

  return isServiceDeliverableType(deliverableType)
    ? deliverableType
    : "document";
}

export function getServiceDeliverableTypeFromServiceSnapshot(
  serviceSnapshot: unknown,
): ServiceDeliverableType {
  if (!isRecord(serviceSnapshot)) {
    return "document";
  }

  return getServiceDeliverableTypeFromMetadata(serviceSnapshot.metadata);
}

export function getServiceDeliverableTypeFromTaskInput(
  input: unknown,
): ServiceDeliverableType {
  if (isRecord(input)) {
    const execution = isRecord(input.execution) ? input.execution : null;
    const explicitType = execution?.deliverableType;
    if (isServiceDeliverableType(explicitType)) {
      return explicitType;
    }

    if (isRecord(input.serviceSnapshot)) {
      return getServiceDeliverableTypeFromServiceSnapshot(input.serviceSnapshot);
    }
  }

  return "document";
}

export function getServiceDeliverablePromptInstruction(
  deliverableType: ServiceDeliverableType,
) {
  switch (deliverableType) {
    case "code":
      return "The expected deliverable is a code package. Prefer clear code, strong file organization, and implementation-ready snippets or artifacts. If requirements are incomplete, still produce a solid starter scaffold, note assumptions inline, and make the next iteration easy.";
    case "contract":
      return "The expected deliverable is a smart contract package. Prefer Solidity, Move, or Rust-style source quality, explicit assumptions, and security-aware structure. If tokenomics or protocol details are missing, produce a narrow but credible draft with clearly labeled assumptions instead of refusing.";
    case "design":
      return "The expected deliverable is a design or image handoff. Focus on creative direction, visual rationale, and image-ready support material. If brand assets are missing, choose a sensible default direction, state the assumptions, and still produce a strong draft concept.";
    case "data":
      return "The expected deliverable is structured data. Favor normalized output, explicit schemas, and machine-readable artifacts. If the source data is partial, still produce the best normalized structure possible and call out missing fields or assumptions.";
    case "spreadsheet":
      return "The expected deliverable is a spreadsheet-style handoff. Favor table structure, reusable rows and columns, formulas or computed fields, and export-friendly organization. If key numbers are missing, provide a usable model template with placeholder assumptions rather than stopping.";
    case "presentation":
      return "The expected deliverable is a presentation deck. Favor slide-by-slide structure, concise headlines, supporting bullets, and a deck-ready narrative. If detailed source materials are sparse, still build a coherent deck outline and draft copy.";
    case "model":
      return "The expected deliverable is a 3D asset handoff. If a native 3D artifact is not being generated automatically, produce a clear design brief, asset notes, and handoff instructions. If geometry references are missing, propose a narrow default form factor and state that it is inferred.";
    case "deployment":
      return "The expected deliverable is a web deployment or hosted preview. Favor launch notes, deployment details, and a clean live-preview handoff. If the full app spec is missing, still produce a launch-ready structure, page map, and deployment assumptions.";
    case "weights":
      return "The expected deliverable is model weights or a checkpoint package. Favor metadata, export notes, and precise handoff details for the delivered binary. If training inputs are incomplete, produce the best checkpoint handoff plan and metadata structure possible from the available context.";
    case "video":
      return "The expected deliverable is a video handoff. Favor shot structure, scene notes, asset directions, and any linked video outputs. If media references are missing, still produce a concise storyboard and direction notes with explicit assumptions.";
    case "audio":
      return "The expected deliverable is an audio handoff. Favor script clarity, delivery notes, voice direction, and any linked audio outputs. If a script or voice sample is missing, still create a usable draft script and delivery direction with stated assumptions.";
    case "document":
    default:
      return "The expected deliverable is a document-style handoff. Favor clarity, polished structure, and customer-ready written output. If sources are thin, still provide the strongest first-pass brief possible, clearly marking inferred assumptions.";
  }
}
