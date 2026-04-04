import type { JsonValue } from "@/lib/api/types"

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
] as const

export type ServiceDeliverableType = (typeof SERVICE_DELIVERABLE_TYPES)[number]

export type ServiceDeliverableAutomationLevel =
  | "ai_ready"
  | "owner_review"
  | "coming_soon"

export type ServiceDeliverableDefinition = {
  value: ServiceDeliverableType
  label: string
  shortLabel: string
  description: string
  automationLevel: ServiceDeliverableAutomationLevel
  automationLabel: string
  serviceHint: string
  ownerUploadHint: string
}

export const serviceDeliverableDefinitions: readonly ServiceDeliverableDefinition[] = [
  {
    value: "document",
    label: "Document",
    shortLabel: "Docs",
    description:
      "Reports, briefs, summaries, copy packs, and other written deliverables such as PDF, DOCX, markdown, or text.",
    automationLevel: "ai_ready",
    automationLabel: "AI-ready",
    serviceHint: "Best for research briefs, reports, summaries, and polished written handoffs.",
    ownerUploadHint: "Attach the final PDF, DOCX, markdown export, or hosted document link.",
  },
  {
    value: "code",
    label: "Code Package",
    shortLabel: "Code",
    description:
      "Application code, scripts, templates, repositories, or archive bundles such as TS, JS, PY, ZIP, or similar.",
    automationLevel: "ai_ready",
    automationLabel: "AI-ready",
    serviceHint: "Best for starter apps, scripts, data pipelines, and repository handoffs.",
    ownerUploadHint: "Attach the source archive, repo export, or hosted code link.",
  },
  {
    value: "contract",
    label: "Smart Contract",
    shortLabel: "Contract",
    description:
      "Web3 contract deliverables such as Solidity, Move, or Rust source files, audits, and deployment-ready packages.",
    automationLevel: "ai_ready",
    automationLabel: "AI-ready",
    serviceHint: "Best for Solidity drafts, contract audits, staking contracts, and protocol logic.",
    ownerUploadHint: "Attach the `.sol`, `.move`, `.rs`, or audit bundle for final delivery.",
  },
  {
    value: "design",
    label: "Design / Image",
    shortLabel: "Design",
    description:
      "Figma-ready concepts, polished image outputs, mockups, banners, thumbnails, and visual campaign assets.",
    automationLevel: "owner_review",
    automationLabel: "Owner review",
    serviceHint: "Best for generated visuals, mockups, hero art, and creative concepts that benefit from review.",
    ownerUploadHint: "Attach the exported image, design package, or hosted design link.",
  },
  {
    value: "data",
    label: "Structured Data",
    shortLabel: "Data",
    description:
      "Machine-readable exports and structured outputs such as JSON, CSV, SQL, database extracts, and analysis datasets.",
    automationLevel: "ai_ready",
    automationLabel: "AI-ready",
    serviceHint: "Best for analytics exports, normalized datasets, and structured machine-readable outputs.",
    ownerUploadHint: "Attach the JSON, CSV, SQL export, or database snapshot.",
  },
  {
    value: "spreadsheet",
    label: "Spreadsheet",
    shortLabel: "Sheets",
    description:
      "Workbook-style deliverables such as XLSX, ODS, financial models, planning sheets, or spreadsheet exports.",
    automationLevel: "ai_ready",
    automationLabel: "AI-ready",
    serviceHint: "Best for tokenomics sheets, ROI models, budget planners, and spreadsheet-friendly outputs.",
    ownerUploadHint: "Attach the `.xlsx`, `.ods`, or exported sheet file.",
  },
  {
    value: "presentation",
    label: "Presentation Deck",
    shortLabel: "Deck",
    description:
      "Slide-based deliverables such as pitch decks, launch decks, strategy presentations, or slide narratives.",
    automationLevel: "coming_soon",
    automationLabel: "AI runner next",
    serviceHint: "Presentation previews are live, but full AI deck-file generation is not wired end to end yet.",
    ownerUploadHint: "Legacy manual deck uploads can still be previewed, but new AI-first services should wait for the presentation runner.",
  },
  {
    value: "model",
    label: "3D Model",
    shortLabel: "3D",
    description:
      "Model-based deliverables such as GLB, GLTF, OBJ, FBX, STL, or similar 3D assets and renders.",
    automationLevel: "coming_soon",
    automationLabel: "AI runner next",
    serviceHint: "3D previews are live, but full AI 3D asset generation is not wired end to end yet.",
    ownerUploadHint: "Legacy manual 3D uploads can still be previewed, but new AI-first services should wait for the model runner.",
  },
  {
    value: "deployment",
    label: "Web Deployment",
    shortLabel: "Deploy",
    description:
      "Hosted websites, live previews, shareable app URLs, or packaged HTML outputs for frontend deliverables.",
    automationLevel: "coming_soon",
    automationLabel: "AI runner next",
    serviceHint: "Deployment previews are live, but automatic publish-and-host flows are not wired end to end yet.",
    ownerUploadHint: "Legacy hosted-link deliveries can still be previewed, but new AI-first services should wait for the deployment runner.",
  },
  {
    value: "weights",
    label: "Model Weights",
    shortLabel: "Weights",
    description:
      "Binary model artifacts such as `.safetensors`, `.gguf`, `.onnx`, checkpoints, and downloadable AI weights.",
    automationLevel: "coming_soon",
    automationLabel: "AI runner next",
    serviceHint: "Weights previews are live, but automated training/export flows are not wired end to end yet.",
    ownerUploadHint: "Legacy checkpoint uploads can still be previewed, but new AI-first services should wait for the weights runner.",
  },
  {
    value: "video",
    label: "Video",
    shortLabel: "Video",
    description:
      "Video deliverables such as teasers, explainers, reels, motion graphics, or exported MP4/MOV handoffs.",
    automationLevel: "coming_soon",
    automationLabel: "AI runner next",
    serviceHint: "Video playback is live, but automatic video generation is not wired end to end yet.",
    ownerUploadHint: "Legacy video uploads can still be previewed, but new AI-first services should wait for the video runner.",
  },
  {
    value: "audio",
    label: "Audio",
    shortLabel: "Audio",
    description:
      "Voiceovers, podcasts, narration, speech synthesis, jingles, and other delivered audio files such as MP3 or WAV.",
    automationLevel: "coming_soon",
    automationLabel: "AI runner next",
    serviceHint: "Audio playback is live, but automatic audio generation is not wired end to end yet.",
    ownerUploadHint: "Legacy audio uploads can still be previewed, but new AI-first services should wait for the audio runner.",
  },
] as const

function getRecord(value: JsonValue | Record<string, unknown> | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isServiceDeliverableType(value: unknown): value is ServiceDeliverableType {
  return (
    typeof value === "string" &&
    SERVICE_DELIVERABLE_TYPES.includes(value as ServiceDeliverableType)
  )
}

export function getServiceDeliverableDefinition(type: ServiceDeliverableType) {
  return (
    serviceDeliverableDefinitions.find((definition) => definition.value === type) ??
    serviceDeliverableDefinitions[0]
  )
}

export function getServiceDeliverableType(
  metadata: JsonValue | Record<string, unknown> | null | undefined,
) {
  const record = getRecord(metadata)
  const subject =
    record && !record.fulfillment && getRecord(record.metadata as JsonValue | Record<string, unknown> | null | undefined)
      ? getRecord(record.metadata as JsonValue | Record<string, unknown> | null | undefined)
      : record
  const fulfillment = getRecord(
    subject?.fulfillment as JsonValue | Record<string, unknown> | null | undefined,
  )
  const value = fulfillment?.deliverableType

  return isServiceDeliverableType(value) ? value : "document"
}

export function getServiceDeliverableDefinitionFromMetadata(
  metadata: JsonValue | Record<string, unknown> | null | undefined,
) {
  return getServiceDeliverableDefinition(getServiceDeliverableType(metadata))
}

export function isServiceDeliverableAiCreatable(type: ServiceDeliverableType) {
  const definition = getServiceDeliverableDefinition(type)
  return (
    definition.automationLevel === "ai_ready" ||
    definition.automationLevel === "owner_review"
  )
}

export function getServiceCreationDeliverableDefinitions() {
  return serviceDeliverableDefinitions.filter((definition) =>
    isServiceDeliverableAiCreatable(definition.value),
  )
}

export function getServiceComingSoonDeliverableDefinitions() {
  return serviceDeliverableDefinitions.filter(
    (definition) => definition.automationLevel === "coming_soon",
  )
}
