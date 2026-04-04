import type { AgentDto, AgentServiceDto, JsonValue } from "@/lib/api/types"
import {
  getServiceDeliverableDefinitionFromMetadata,
} from "@/lib/services/deliverable-profile"
import {
  getServiceExecutionMode,
  getServiceExecutionModeDefinition,
} from "@/lib/services/execution-mode"

export const allMarketplaceCategoriesLabel = "All Services"

export const marketplaceCategoryDefinitions = [
  {
    label: "Ads & Flyers",
    description: "Banner ads, visual campaigns, hero concepts, flyers, notices, and launch announcement creative.",
  },
  {
    label: "Research & Strategy",
    description: "Competitor briefs, market scans, positioning work, and strategic summaries.",
  },
  {
    label: "Docs & Copy",
    description: "Reports, copy packs, summaries, launch docs, and written handoffs.",
  },
  {
    label: "Code & Contracts",
    description: "Starter apps, scripts, smart contracts, and technical implementation deliverables.",
  },
  {
    label: "Data & Sheets",
    description: "Structured exports, analytics, tokenomics packs, and spreadsheet-style outputs.",
  },
  {
    label: "Web & Frontend",
    description: "Dashboards, websites, landing pages, and deployable interface work.",
  },
  {
    label: "Video & Audio",
    description: "Teasers, explainers, voiceover, and media-oriented service work.",
  },
  {
    label: "General AI Services",
    description: "Flexible service listings that do not fit a single discovery lane yet.",
  },
] as const

export type MarketplaceCategoryLabel =
  (typeof marketplaceCategoryDefinitions)[number]["label"]

export type MarketplacePlacement = {
  label: string
  note: string
}

export type MarketplaceServiceVisual = {
  imageUrl: string | null
  imageAlt: string
  promoLabel: string
  promoHeadline: string
  promoNote: string
  placements: MarketplacePlacement[]
  buyerChecklist: string[]
}

type MarketplaceAgentLike = Pick<AgentDto, "category" | "description"> | {
  category?: string | null
  description?: string | null
} | null

function getRecord(value: JsonValue | Record<string, unknown> | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readStringCandidate(
  value: JsonValue | Record<string, unknown> | unknown,
) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function readNestedString(
  record: Record<string, unknown> | null,
  path: readonly string[],
): string | null {
  let current: unknown = record

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return readStringCandidate(current)
}

export function buildMarketplaceServiceHref(serviceId: string) {
  return `/marketplace/services/${serviceId}`
}

export function getMarketplaceDiscoveryCategory(
  service: Pick<AgentServiceDto, "title" | "description" | "metadata">,
  agent: MarketplaceAgentLike,
) {
  const deliverableDefinition = getServiceDeliverableDefinitionFromMetadata(service.metadata)
  const keywordSource = [
    service.title,
    service.description,
    deliverableDefinition.label,
    deliverableDefinition.description,
    agent?.category,
    agent?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (
    deliverableDefinition.value === "design" ||
    /(flyer|banner|poster|thumbnail|creative|campaign|visual|ad\b|ads\b|notice|announcement|launch card|social media)/.test(keywordSource)
  ) {
    return "Ads & Flyers"
  }

  if (
    /(competitor|research|market|analysis|strategy|positioning|go-to-market|brief)/.test(
      keywordSource,
    )
  ) {
    return "Research & Strategy"
  }

  if (
    deliverableDefinition.value === "contract" ||
    /(solidity|staking|token|contract|web3|protocol|move\b|rust\b)/.test(keywordSource)
  ) {
    return "Code & Contracts"
  }

  if (
    deliverableDefinition.value === "code" ||
    deliverableDefinition.value === "deployment" ||
    /(react|frontend|landing page|website|web app|dashboard starter|ui\b|ux\b|site\b)/.test(
      keywordSource,
    )
  ) {
    return "Web & Frontend"
  }

  if (
    deliverableDefinition.value === "data" ||
    deliverableDefinition.value === "spreadsheet" ||
    /(analytics|csv|json|spreadsheet|tokenomics|forecast|roi|export|data)/.test(
      keywordSource,
    )
  ) {
    return "Data & Sheets"
  }

  if (
    deliverableDefinition.value === "video" ||
    deliverableDefinition.value === "audio" ||
    /(video|audio|voiceover|podcast|trailer|teaser|reel|motion)/.test(keywordSource)
  ) {
    return "Video & Audio"
  }

  if (
    deliverableDefinition.value === "document" &&
    /(copy|landing page copy|script|summary|report|proposal|documentation|doc|document)/.test(
      keywordSource,
    )
  ) {
    return "Docs & Copy"
  }

  return "General AI Services"
}

export function getMarketplaceServiceSocialHeadline(
  service: Pick<AgentServiceDto, "estimatedDeliveryMinutes">,
  discoveryCategory: string,
  agent: Pick<AgentDto, "orderCount" | "serviceCount"> | {
    orderCount?: number | null
    serviceCount?: number | null
  } | null,
) {
  if ((agent?.orderCount ?? 0) >= 8) {
    return "High activity listing"
  }

  if ((agent?.serviceCount ?? 0) >= 3) {
    return "Multi-service operator"
  }

  if (discoveryCategory === "Ads & Flyers") {
    return "Creative briefs land well here"
  }

  if (discoveryCategory === "Code & Contracts") {
    return "Technical build flow"
  }

  if (discoveryCategory === "Research & Strategy") {
    return "Research-heavy service"
  }

  return service.estimatedDeliveryMinutes && service.estimatedDeliveryMinutes <= 90
    ? "Fast-turn service"
    : "Fresh live listing"
}

export function getMarketplaceServiceSocialNote(
  service: Pick<AgentServiceDto, "metadata">,
  discoveryCategory: string,
) {
  const deliverableDefinition = getServiceDeliverableDefinitionFromMetadata(service.metadata)
  const executionMode = getServiceExecutionMode(service.metadata)
  const executionModeDefinition = getServiceExecutionModeDefinition(executionMode)

  if (discoveryCategory === "Ads & Flyers") {
    return "Best when the buyer brings brand tone, campaign goal, launch context, and a few visual references."
  }

  if (discoveryCategory === "Research & Strategy") {
    return "Strong fit for briefs, competitor names, source links, and positioning questions."
  }

  if (discoveryCategory === "Code & Contracts") {
    return "Works best when the buyer shares stack constraints, chain rules, and expected outputs."
  }

  return `${deliverableDefinition.shortLabel} delivery through ${executionModeDefinition.shortLabel.toLowerCase()} flow.`
}

function getMarketplaceCoverUrl(
  service: Pick<AgentServiceDto, "title" | "metadata">,
) {
  const metadata = getRecord(service.metadata)
  const candidate =
    readNestedString(metadata, ["marketplace", "coverImageUrl"]) ??
    readNestedString(metadata, ["marketplace", "bannerImageUrl"]) ??
    readNestedString(metadata, ["marketplace", "heroImageUrl"]) ??
    readNestedString(metadata, ["marketplace", "previewImageUrl"]) ??
    readNestedString(metadata, ["visuals", "coverImageUrl"]) ??
    readNestedString(metadata, ["visuals", "bannerImageUrl"]) ??
    readNestedString(metadata, ["visuals", "heroImageUrl"]) ??
    readNestedString(metadata, ["visuals", "previewImageUrl"]) ??
    readNestedString(metadata, ["cover", "url"]) ??
    readNestedString(metadata, ["hero", "imageUrl"]) ??
    readNestedString(metadata, ["banner", "imageUrl"]) ??
    readNestedString(metadata, ["preview", "imageUrl"]) ??
    readNestedString(metadata, ["images", "cover"]) ??
    readNestedString(metadata, ["images", "hero"]) ??
    readNestedString(metadata, ["images", "banner"]) ??
    readNestedString(metadata, ["assets", "coverImageUrl"]) ??
    readNestedString(metadata, ["assets", "imageUrl"]) ??
    readNestedString(metadata, ["deliverable", "coverImageUrl"]) ??
    readNestedString(metadata, ["deliverable", "previewImageUrl"]) ??
    readNestedString(metadata, ["deliverable", "imageUrl"]) ??
    readStringCandidate(metadata?.coverImageUrl) ??
    readStringCandidate(metadata?.bannerImageUrl) ??
    readStringCandidate(metadata?.heroImageUrl) ??
    readStringCandidate(metadata?.previewImageUrl) ??
    readStringCandidate(metadata?.imageUrl) ??
    readStringCandidate(metadata?.thumbnailUrl)

  return candidate ?? null
}

function getMarketplacePlacements(discoveryCategory: string): MarketplacePlacement[] {
  switch (discoveryCategory) {
    case "Ads & Flyers":
      return [
        { label: "Announcement Banner", note: "Launch notices, updates, and event callouts." },
        { label: "Promo Flyer", note: "Short-run offers, campaigns, and storefront distribution." },
        { label: "Feed Ad Creative", note: "Social placements, story cards, and swipe-worthy promos." },
        { label: "Notice Card", note: "Product announcements, reminders, and internal notices." },
      ]
    case "Research & Strategy":
      return [
        { label: "Competitor Brief", note: "Positioning comparisons with narrow, relevant peers." },
        { label: "Market Scan", note: "Quick landscape snapshots for operators and founders." },
        { label: "Strategy Memo", note: "Decision-ready recommendations with clear tradeoffs." },
        { label: "Opportunity Map", note: "Whitespace and differentiation areas to pursue." },
      ]
    case "Docs & Copy":
      return [
        { label: "Launch Copy Pack", note: "Landing pages, notices, and promotional copy blocks." },
        { label: "Internal Memo", note: "Briefings, summaries, and operator-ready written handoffs." },
        { label: "Announcement Copy", note: "Product updates, rollouts, and feature notices." },
        { label: "Campaign Script", note: "Copy sequences for ads, reels, and email drops." },
      ]
    case "Code & Contracts":
      return [
        { label: "Starter Build", note: "Implementation-ready source for the first delivery." },
        { label: "Contract Draft", note: "Protocol logic, token rules, and review notes." },
        { label: "Audit Pass", note: "Risk flags and fix notes before shipping." },
        { label: "Integration Scaffold", note: "Practical handoff for the next dev cycle." },
      ]
    case "Data & Sheets":
      return [
        { label: "Analytics Export", note: "Structured JSON, CSV, and normalized reporting outputs." },
        { label: "Ops Sheet", note: "Planning models, trackers, and spreadsheet-ready tabs." },
        { label: "Tokenomics Model", note: "Supply, rewards, and reserve planning scenarios." },
        { label: "Forecast Pack", note: "Growth and KPI projections for operator review." },
      ]
    case "Web & Frontend":
      return [
        { label: "Hero Section", note: "Landing page banners, launch strips, and CTA sections." },
        { label: "Dashboard Shell", note: "Responsive product surfaces and admin scaffolds." },
        { label: "Microsite", note: "Campaign pages, product notices, and announcement pages." },
        { label: "Frontend Handoff", note: "Components and setup ready for iteration." },
      ]
    case "Video & Audio":
      return [
        { label: "Teaser Creative", note: "Short-form launch promos and campaign clips." },
        { label: "Announcement Reel", note: "Notice-style videos for social and community drops." },
        { label: "Voiceover Pack", note: "Narration, intros, and announcement audio." },
        { label: "Promo Cutdown", note: "Fast assets for stories, reels, and paid distribution." },
      ]
    default:
      return [
        { label: "Live Listing", note: "A buyer-ready service published to the marketplace." },
        { label: "Custom Brief", note: "Flexible intake shaped around the customer request." },
        { label: "Operator Handoff", note: "Work packaged so the next step is immediately clear." },
        { label: "Marketplace Offer", note: "A storefront-ready service that can be ordered now." },
      ]
  }
}

function getMarketplaceBuyerChecklist(discoveryCategory: string) {
  switch (discoveryCategory) {
    case "Ads & Flyers":
      return [
        "Business or product name",
        "What the banner, flyer, ad, or announcement is for",
        "Target audience and call to action",
        "Brand colors, logo, references, or existing visuals",
      ]
    case "Research & Strategy":
      return [
        "Business or product context",
        "Competitor names, links, or market segment",
        "What should be compared or investigated",
        "Any existing notes, decks, or source files",
      ]
    case "Docs & Copy":
      return [
        "Product, business, or campaign context",
        "Who the document or copy is for",
        "Tone, outcome, and any non-negotiable points",
        "Source links, files, or internal notes if available",
      ]
    case "Code & Contracts":
      return [
        "Scope of the build or contract",
        "Preferred stack, chain, or runtime rules",
        "Required integrations and constraints",
        "Reference repos, specs, or interface notes",
      ]
    case "Data & Sheets":
      return [
        "What output should be produced",
        "Which metrics, fields, or entities matter most",
        "Source files such as CSV, JSON, or notes",
        "Any time range or reporting structure to prioritize",
      ]
    case "Web & Frontend":
      return [
        "What page or product surface should be built",
        "Desired sections, layout, and responsiveness",
        "Brand direction and examples you like",
        "Any copy, screenshots, or component references",
      ]
    case "Video & Audio":
      return [
        "What the media asset is for",
        "Target format, duration, and tone",
        "Script points, product context, or references",
        "Brand assets or examples to match",
      ]
    default:
      return [
        "A clear business or product context",
        "What outcome the customer wants",
        "Any files, links, or references that sharpen the brief",
        "Constraints, timing, and important success criteria",
      ]
  }
}

export function getMarketplaceServiceVisual(
  service: Pick<AgentServiceDto, "id" | "title" | "description" | "metadata">,
  options: {
    discoveryCategory?: string
  } = {},
): MarketplaceServiceVisual {
  const discoveryCategory =
    options.discoveryCategory ?? getMarketplaceDiscoveryCategory(service, null)
  const imageUrl = getMarketplaceCoverUrl(service)
  const placements = getMarketplacePlacements(discoveryCategory)

  switch (discoveryCategory) {
    case "Ads & Flyers":
      return {
        imageUrl,
        imageAlt: `${service.title} marketplace banner preview`,
        promoLabel: "Ad creative",
        promoHeadline: "Banners, flyers, and announcement visuals",
        promoNote: "Built for campaigns, notices, launch cards, and social-first promos.",
        placements,
        buyerChecklist: getMarketplaceBuyerChecklist(discoveryCategory),
      }
    case "Research & Strategy":
      return {
        imageUrl,
        imageAlt: `${service.title} strategy listing preview`,
        promoLabel: "Strategy lane",
        promoHeadline: "Research outputs buyers can act on",
        promoNote: "Good for competitor studies, briefs, landscape scans, and positioning work.",
        placements,
        buyerChecklist: getMarketplaceBuyerChecklist(discoveryCategory),
      }
    case "Docs & Copy":
      return {
        imageUrl,
        imageAlt: `${service.title} document listing preview`,
        promoLabel: "Document lane",
        promoHeadline: "Polished written delivery for launches and ops",
        promoNote: "Fits summaries, launch docs, copy packs, notices, and structured written handoff.",
        placements,
        buyerChecklist: getMarketplaceBuyerChecklist(discoveryCategory),
      }
    case "Code & Contracts":
      return {
        imageUrl,
        imageAlt: `${service.title} technical listing preview`,
        promoLabel: "Technical build",
        promoHeadline: "Implementation-focused services ready for review",
        promoNote: "Best for contract drafts, code handoff, protocol logic, and technical scaffolds.",
        placements,
        buyerChecklist: getMarketplaceBuyerChecklist(discoveryCategory),
      }
    case "Data & Sheets":
      return {
        imageUrl,
        imageAlt: `${service.title} analytics listing preview`,
        promoLabel: "Structured output",
        promoHeadline: "Exports, sheets, and operator-ready data packs",
        promoNote: "Useful for analytics, reports, tokenomics packs, and spreadsheet workflows.",
        placements,
        buyerChecklist: getMarketplaceBuyerChecklist(discoveryCategory),
      }
    case "Web & Frontend":
      return {
        imageUrl,
        imageAlt: `${service.title} frontend listing preview`,
        promoLabel: "Frontend ship",
        promoHeadline: "Landing pages, hero banners, and deploy-ready UI work",
        promoNote: "Strong fit for websites, dashboards, launch pages, and presentation-ready interfaces.",
        placements,
        buyerChecklist: getMarketplaceBuyerChecklist(discoveryCategory),
      }
    case "Video & Audio":
      return {
        imageUrl,
        imageAlt: `${service.title} media listing preview`,
        promoLabel: "Media lane",
        promoHeadline: "Teasers, voiceover, reels, and launch media",
        promoNote: "Good for campaign media, launch clips, explainers, and community announcements.",
        placements,
        buyerChecklist: getMarketplaceBuyerChecklist(discoveryCategory),
      }
    default:
      return {
        imageUrl,
        imageAlt: `${service.title} marketplace listing preview`,
        promoLabel: "Live listing",
        promoHeadline: "Flexible service listing ready for a brief",
        promoNote: "This service is live now and shaped around the customer brief at checkout.",
        placements,
        buyerChecklist: getMarketplaceBuyerChecklist(discoveryCategory),
      }
  }
}
