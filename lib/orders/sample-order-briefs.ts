import type { AgentServiceDto } from "@/lib/api/types"
import type { CheckoutContext } from "@/lib/orders/checkout"
import {
  getServiceDeliverableType,
  type ServiceDeliverableType,
} from "@/lib/services/deliverable-profile"
import {
  getServiceExecutionMode,
  getServiceExecutionModeDefinition,
} from "@/lib/services/execution-mode"

export type SampleOrderBrief = {
  id: string
  label: string
  summary: string
  content: string
}

function buildStructuredExportBrief(serviceTitle: string) {
  return [
    `Goal: Prepare a structured analytics export for the "${serviceTitle}" service.`,
    "",
    "What I am attaching:",
    "- CSV or spreadsheet exports with performance data",
    "- JSON or dashboard exports with campaign metrics",
    "- Notes or transcripts explaining the business context",
    "",
    "Please deliver:",
    "- A short executive summary",
    "- A cleaned and normalized view of the supplied data",
    "- Key trends, anomalies, and missing fields",
    "- Three recommended next actions based on the numbers",
    "- Reusable machine-readable output where helpful",
    "",
    "Focus on clarity, explicit assumptions, and anything that looks inconsistent.",
  ].join("\n")
}

function buildVisualDraftBrief(serviceTitle: string) {
  return [
    `Goal: Create a polished visual draft for the "${serviceTitle}" service.`,
    "",
    "What I am attaching:",
    "- Brand references, logos, or screenshots",
    "- Inspiration images or moodboard links",
    "- Product visuals and offer details",
    "",
    "Please create:",
    "- One strong primary concept",
    "- One alternate variation if possible",
    "- A short note explaining the design direction",
    "",
    "Visual direction:",
    "- Clean, premium, and easy to understand quickly",
    "- Strong hierarchy and good mobile readability",
    "- Avoid clutter, watermarks, or extra text unless requested",
  ].join("\n")
}

function buildResearchBrief(serviceTitle: string) {
  return [
    `Goal: Use the "${serviceTitle}" service to prepare a grounded research brief.`,
    "",
    "What I am attaching:",
    "- Source links I want reviewed",
    "- PDFs, notes, or transcripts with context",
    "",
    "Please deliver:",
    "- A concise summary of the important findings",
    "- Source-backed observations and comparisons",
    "- Clear risks, opportunities, and recommendations",
    "",
    "Keep the result structured and easy to skim.",
  ].join("\n")
}

function buildTextDeliveryBrief(serviceTitle: string) {
  return [
    `Goal: Use the "${serviceTitle}" service to create the final customer-ready draft.`,
    "",
    "What I need:",
    "- A polished output that follows the brief exactly",
    "- Clear structure and strong readability",
    "- A short delivery note explaining what was produced",
    "",
    "I will attach any references, links, or examples that should guide the result.",
  ].join("\n")
}

function buildManualDeliveryBrief(serviceTitle: string) {
  return [
    `Goal: Prepare the inputs needed for the "${serviceTitle}" service.`,
    "",
    "What I am attaching:",
    "- My source material, notes, and references",
    "",
    "Please use these to complete the work manually and return a clear final delivery.",
  ].join("\n")
}

function buildDeliverableSpecificBrief(
  serviceTitle: string,
  deliverableType: ServiceDeliverableType,
) {
  switch (deliverableType) {
    case "contract":
      return [
        `Goal: Use the "${serviceTitle}" service to draft a smart contract deliverable.`,
        "",
        "What I am attaching:",
        "- Protocol requirements, token details, and product notes",
        "- Any security assumptions or reference contracts",
        "",
        "Please deliver:",
        "- Clear contract logic",
        "- Assumptions and risks",
        "- Deployment or integration notes where helpful",
      ].join("\n")
    case "code":
      return [
        `Goal: Use the "${serviceTitle}" service to produce a working code handoff.`,
        "",
        "What I am attaching:",
        "- Feature requirements",
        "- Existing snippets, APIs, or schema notes",
        "",
        "Please deliver:",
        "- Clean implementation-ready code",
        "- Short setup notes",
        "- Any files or exports needed to run it",
      ].join("\n")
    case "presentation":
      return [
        `Goal: Build the content for the "${serviceTitle}" presentation deliverable.`,
        "",
        "What I am attaching:",
        "- Product notes and positioning",
        "- Audience context and key metrics",
        "",
        "Please deliver:",
        "- Slide-by-slide structure",
        "- Strong headlines",
        "- Clear supporting bullets and CTA ideas",
      ].join("\n")
    case "model":
      return [
        `Goal: Prepare the "${serviceTitle}" 3D deliverable.`,
        "",
        "What I am attaching:",
        "- Product references, dimensions, and style notes",
        "- Screenshots, sketches, or moodboard references",
        "",
        "Please deliver:",
        "- The final 3D asset",
        "- A short handoff note covering intended use and any constraints",
      ].join("\n")
    case "deployment":
      return [
        `Goal: Deliver a live preview for the "${serviceTitle}" service.`,
        "",
        "What I am attaching:",
        "- Copy, layout notes, screenshots, and brand direction",
        "",
        "Please deliver:",
        "- A working hosted preview or packaged HTML output",
        "- A short note explaining what is live and what still needs polishing",
      ].join("\n")
    case "weights":
      return [
        `Goal: Deliver the "${serviceTitle}" checkpoint or model export.`,
        "",
        "What I am attaching:",
        "- Training notes, model targets, and export requirements",
        "",
        "Please deliver:",
        "- The final checkpoint or model file",
        "- Core metadata and compatibility notes",
      ].join("\n")
    case "video":
      return [
        `Goal: Deliver the final video output for the "${serviceTitle}" service.`,
        "",
        "What I am attaching:",
        "- Product notes, reference videos, and scene direction",
        "",
        "Please deliver:",
        "- Final exported video",
        "- A short note on timing, framing, and intended use",
      ].join("\n")
    case "audio":
      return [
        `Goal: Deliver the final audio output for the "${serviceTitle}" service.`,
        "",
        "What I am attaching:",
        "- Script, tone guidance, and pronunciation notes",
        "",
        "Please deliver:",
        "- Final audio file",
        "- A short note on delivery style and usage guidance",
      ].join("\n")
    case "spreadsheet":
      return [
        `Goal: Use the "${serviceTitle}" service to prepare a spreadsheet-ready deliverable.`,
        "",
        "What I am attaching:",
        "- Raw financial or planning data",
        "- Notes explaining the important columns or calculations",
        "",
        "Please deliver:",
        "- A structured workbook-style output",
        "- Clean tabs, fields, or sheet sections",
        "- Summary insights that explain what matters most",
      ].join("\n")
    case "data":
      return buildStructuredExportBrief(serviceTitle)
    case "design":
      return buildVisualDraftBrief(serviceTitle)
    case "document":
    default:
      return buildTextDeliveryBrief(serviceTitle)
  }
}

export function buildSampleOrderBriefs(input: {
  checkout: CheckoutContext
  service?: AgentServiceDto | null
}) {
  const mode = getServiceExecutionMode(input.service?.metadata ?? null)
  const modeDefinition = getServiceExecutionModeDefinition(mode)
  const deliverableType = getServiceDeliverableType(input.service?.metadata ?? null)
  const serviceTitle = input.service?.title ?? input.checkout.serviceTitle

  const modeSpecificBrief =
    mode === "hybrid_ai_plus_owner_review"
      ? buildVisualDraftBrief(serviceTitle)
      : mode === "research_with_links"
          ? buildResearchBrief(serviceTitle)
          : mode === "manual_owner_delivery"
            ? buildDeliverableSpecificBrief(serviceTitle, deliverableType)
            : mode === "file_generation"
              ? buildDeliverableSpecificBrief(serviceTitle, deliverableType)
              : buildDeliverableSpecificBrief(serviceTitle, deliverableType)

  return [
    {
      id: `${mode}-starter`,
      label: `${modeDefinition.shortLabel} starter`,
      summary: `Autofill a sample brief tailored to ${modeDefinition.label.toLowerCase()}.`,
      content: modeSpecificBrief,
    },
  ] satisfies SampleOrderBrief[]
}
