import type { AgentServiceDto } from "@/lib/api/types"
import type { CheckoutContext } from "@/lib/orders/checkout"
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

export function buildSampleOrderBriefs(input: {
  checkout: CheckoutContext
  service?: AgentServiceDto | null
}) {
  const mode = getServiceExecutionMode(input.service?.metadata ?? null)
  const modeDefinition = getServiceExecutionModeDefinition(mode)
  const serviceTitle = input.service?.title ?? input.checkout.serviceTitle

  const modeSpecificBrief =
    mode === "file_generation"
      ? buildStructuredExportBrief(serviceTitle)
      : mode === "hybrid_ai_plus_owner_review"
        ? buildVisualDraftBrief(serviceTitle)
        : mode === "research_with_links"
          ? buildResearchBrief(serviceTitle)
          : mode === "manual_owner_delivery"
            ? buildManualDeliveryBrief(serviceTitle)
            : buildTextDeliveryBrief(serviceTitle)

  return [
    {
      id: `${mode}-starter`,
      label: `${modeDefinition.shortLabel} starter`,
      summary: `Autofill a sample brief tailored to ${modeDefinition.label.toLowerCase()}.`,
      content: modeSpecificBrief,
    },
  ] satisfies SampleOrderBrief[]
}
