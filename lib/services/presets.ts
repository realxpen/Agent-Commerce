import type { ServiceDeliverableType } from "@/lib/services/deliverable-profile"
import type { ServiceExecutionMode } from "@/lib/services/execution-mode"

export type WorkingServicePreset = {
  id: string
  title: string
  description: string
  priceAmount: string
  estimatedDeliveryMinutes: string
  executionMode: ServiceExecutionMode
  deliverableType: ServiceDeliverableType
  spotlight: string
  expectedOutput: string
}

export const workingServicePresets: readonly WorkingServicePreset[] = [
  {
    id: "structured-export",
    title: "Structured Analytics Export",
    description:
      "Upload CSV, JSON, notes, or transcripts and receive a normalized analytics pack with computed findings, a briefing document, and export-ready files.",
    priceAmount: "35",
    estimatedDeliveryMinutes: "90",
    executionMode: "file_generation",
    deliverableType: "data",
    spotlight: "Best for the guarded code runner and file artifacts.",
    expectedOutput: "JSON export, markdown briefing, and computed analysis files.",
  },
  {
    id: "competitor-brief",
    title: "Competitor Research Brief",
    description:
      "Research the referenced competitors, compare their messaging and positioning, and produce a concise brief with grounded findings and source-backed recommendations.",
    priceAmount: "30",
    estimatedDeliveryMinutes: "90",
    executionMode: "research_with_links",
    deliverableType: "document",
    spotlight: "Best for source-backed research output and clean document delivery.",
    expectedOutput: "Research brief with structured findings, links, and market gaps.",
  },
  {
    id: "visual-draft-kit",
    title: "Visual Campaign Draft Kit",
    description:
      "Turn a brief plus reference images into polished draft visuals for ads, thumbnails, posters, or hero artwork, then review the draft before delivery.",
    priceAmount: "45",
    estimatedDeliveryMinutes: "120",
    executionMode: "hybrid_ai_plus_owner_review",
    deliverableType: "design",
    spotlight: "Best for image generation with owner review.",
    expectedOutput: "Generated image artifacts waiting in the owner review stage.",
  },
  {
    id: "staking-contract",
    title: "ERC20 Staking Contract Draft",
    description:
      "Draft a staking smart contract package with reward logic, security notes, and implementation-ready source material.",
    priceAmount: "80",
    estimatedDeliveryMinutes: "180",
    executionMode: "file_generation",
    deliverableType: "contract",
    spotlight: "Best for smart contract code previews and downloadable source.",
    expectedOutput: "Solidity or Rust-style contract source plus implementation notes.",
  },
  {
    id: "dashboard-starter",
    title: "React Dashboard Starter",
    description:
      "Build a starter dashboard package with typed components, clean sections, and code the owner can ship or extend.",
    priceAmount: "60",
    estimatedDeliveryMinutes: "120",
    executionMode: "file_generation",
    deliverableType: "code",
    spotlight: "Best for code package delivery and archive-style handoff.",
    expectedOutput: "TSX, TS, and structured code artifacts ready to download.",
  },
  {
    id: "tokenomics-sheet",
    title: "Tokenomics Spreadsheet Pack",
    description:
      "Turn uploaded metrics, assumptions, and planning notes into a spreadsheet-ready tokenomics or ROI pack with clean tabs and summary guidance.",
    priceAmount: "50",
    estimatedDeliveryMinutes: "120",
    executionMode: "file_generation",
    deliverableType: "spreadsheet",
    spotlight: "Best for workbook-style outputs and sheet-friendly exports.",
    expectedOutput: "Spreadsheet-oriented file pack with structured calculations and summary notes.",
  },
] as const

function normalizeWorkingPresetTitle(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? ""
}

const workingPresetTitleSet = new Set(
  workingServicePresets.map((preset) => normalizeWorkingPresetTitle(preset.title)),
)

export function findWorkingServicePresetByTitle(title: string | null | undefined) {
  const normalizedTitle = normalizeWorkingPresetTitle(title)

  return (
    workingServicePresets.find(
      (preset) => normalizeWorkingPresetTitle(preset.title) === normalizedTitle,
    ) ?? null
  )
}

export function isWorkingServicePresetTitle(title: string | null | undefined) {
  return workingPresetTitleSet.has(normalizeWorkingPresetTitle(title))
}

export function filterWorkingPresetServices<
  T extends {
    title: string | null | undefined
  },
>(services: readonly T[]) {
  return services.filter((service) => isWorkingServicePresetTitle(service.title))
}
