import type { AgentServiceDto, OrderReference } from "@/lib/api/types"
import { getServiceDeliverableType } from "@/lib/services/deliverable-profile"
import { getServiceExecutionMode } from "@/lib/services/execution-mode"

export type BriefCoachTone = "success" | "warning" | "outline"

export type BriefCoachMessage = {
  id: string
  tone: BriefCoachTone
  title: string
  body: string
}

export type BriefCoachAction = {
  id: string
  label: string
  text: string
}

export type BriefCoachServiceFit = "aligned" | "mismatch" | "unknown"

export type BriefCoachServiceRecommendation = {
  service: AgentServiceDto
  reason: string
  archetype: ServiceArchetype
  archetypeLabel: string
}

export type BriefCoachPlan = {
  status: "needs_brief" | "needs_context" | "ready" | "wrong_service"
  statusLabel: string
  summary: string
  messages: BriefCoachMessage[]
  actions: BriefCoachAction[]
  suggestedAttachments: string[]
  isCheckoutReady: boolean
  blockingMessage: string | null
  serviceFit: BriefCoachServiceFit
  requestedServiceLabel: string | null
  selectedServiceLabel: string | null
  recommendedServices: BriefCoachServiceRecommendation[]
}

type ServiceArchetype =
  | "competitor_research"
  | "research"
  | "design"
  | "code"
  | "contract"
  | "data"
  | "spreadsheet"
  | "document"

function containsAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate))
}

function buildPlan(
  input: Omit<
    BriefCoachPlan,
    | "isCheckoutReady"
    | "serviceFit"
    | "requestedServiceLabel"
    | "selectedServiceLabel"
    | "recommendedServices"
  > &
    Partial<
      Pick<
        BriefCoachPlan,
        | "serviceFit"
        | "requestedServiceLabel"
        | "selectedServiceLabel"
        | "recommendedServices"
      >
    >,
) {
  return {
    ...input,
    serviceFit: input.serviceFit ?? "unknown",
    requestedServiceLabel: input.requestedServiceLabel ?? null,
    selectedServiceLabel: input.selectedServiceLabel ?? null,
    recommendedServices: input.recommendedServices ?? [],
    isCheckoutReady: input.status === "ready",
  } satisfies BriefCoachPlan
}

function inferServiceArchetype(input: {
  serviceTitle: string
  serviceDescription: string | null
  service?: AgentServiceDto | null
  serviceMetadata?: AgentServiceDto["metadata"] | null
}): ServiceArchetype {
  const haystack = [
    input.serviceTitle,
    input.serviceDescription ?? "",
    input.service?.description ?? "",
  ]
    .join(" ")
    .toLowerCase()
  const metadata = input.service?.metadata ?? input.serviceMetadata ?? null
  const deliverableType = getServiceDeliverableType(metadata)
  const executionMode = getServiceExecutionMode(metadata)

  if (containsAny(haystack, ["competitor", "benchmark", "market landscape"])) {
    return "competitor_research"
  }

  if (executionMode === "research_with_links" || haystack.includes("research")) {
    return "research"
  }

  if (deliverableType === "design") {
    return "design"
  }

  if (deliverableType === "contract") {
    return "contract"
  }

  if (deliverableType === "code") {
    return "code"
  }

  if (deliverableType === "data") {
    return "data"
  }

  if (deliverableType === "spreadsheet") {
    return "spreadsheet"
  }

  return "document"
}

function getArchetypeLabel(archetype: ServiceArchetype) {
  switch (archetype) {
    case "competitor_research":
      return "Competitor Research"
    case "research":
      return "Research"
    case "design":
      return "Design / Visual"
    case "code":
      return "Code Build"
    case "contract":
      return "Smart Contract"
    case "data":
      return "Structured Data"
    case "spreadsheet":
      return "Spreadsheet / Model"
    case "document":
    default:
      return "Document / Writing"
  }
}

function inferRequestedArchetype(note: string): ServiceArchetype | null {
  const noteLower = note.toLowerCase()

  if (noteLower.trim().length < 8) {
    return null
  }

  if (
    containsAny(noteLower, [
      "smart contract",
      "solidity",
      "erc20",
      "erc721",
      "staking contract",
      "token contract",
      "audit this contract",
      "contract audit",
      "move module",
      "rust contract",
      "defi protocol",
    ])
  ) {
    return "contract"
  }

  if (
    containsAny(noteLower, [
      "flyer",
      "banner",
      "poster",
      "thumbnail",
      "social creative",
      "ad creative",
      "logo",
      "mockup",
      "visual concept",
      "creative direction",
      "brochure",
      "brand design",
      "hero image",
      "campaign visual",
    ])
  ) {
    return "design"
  }

  if (
    containsAny(noteLower, [
      "tokenomics spreadsheet",
      "financial model",
      "roi calculator",
      "spreadsheet",
      "workbook",
      "budget sheet",
      "allocation model",
      "cap table",
      "planning sheet",
      "forecast sheet",
    ])
  ) {
    return "spreadsheet"
  }

  if (
    containsAny(noteLower, [
      "competitor research",
      "competitor analysis",
      "compare competitors",
      "benchmark competitors",
      "market landscape",
      "pricing comparison",
      "positioning comparison",
      "competitor brief",
    ])
  ) {
    return "competitor_research"
  }

  if (
    containsAny(noteLower, [
      "csv",
      "json export",
      "analytics export",
      "data export",
      "normalize this data",
      "clean this dataset",
      "dashboard metrics",
      "structured data",
      "dataset",
      "sql export",
      "reporting data",
    ])
  ) {
    return "data"
  }

  if (
    containsAny(noteLower, [
      "build me",
      "build a",
      "code this",
      "create a website",
      "react app",
      "next.js",
      "nextjs",
      "typescript app",
      "dashboard starter",
      "api integration",
      "frontend",
      "backend",
      "component",
      "script",
      "automation script",
    ])
  ) {
    return "code"
  }

  if (
    containsAny(noteLower, [
      "research",
      "analyze",
      "analysis",
      "research brief",
      "market research",
      "summarize these sources",
      "source digest",
      "investigate",
      "find insights",
    ])
  ) {
    return "research"
  }

  if (
    containsAny(noteLower, [
      "write",
      "copy",
      "report",
      "brief",
      "summary",
      "script",
      "faq",
      "product description",
      "landing page copy",
      "case study",
      "proposal",
      "memo",
      "document",
    ])
  ) {
    return "document"
  }

  return null
}

function areArchetypesCompatible(
  selectedArchetype: ServiceArchetype,
  requestedArchetype: ServiceArchetype,
) {
  if (selectedArchetype === requestedArchetype) {
    return true
  }

  const researchGroup = new Set<ServiceArchetype>([
    "competitor_research",
    "research",
  ])
  const dataGroup = new Set<ServiceArchetype>(["data", "spreadsheet"])

  if (
    researchGroup.has(selectedArchetype) &&
    researchGroup.has(requestedArchetype)
  ) {
    return true
  }

  if (dataGroup.has(selectedArchetype) && dataGroup.has(requestedArchetype)) {
    return true
  }

  return false
}

function buildRecommendationReason(archetype: ServiceArchetype) {
  switch (archetype) {
    case "competitor_research":
      return "This service is better suited for competitor shortlists, market comparisons, pricing analysis, and positioning research."
    case "research":
      return "This service is better suited for research, analysis, summaries, and source-backed briefs."
    case "design":
      return "This service is better suited for flyers, banners, campaign visuals, mockups, and other design deliverables."
    case "contract":
      return "This service is better suited for Solidity, Move, staking logic, audits, and smart contract work."
    case "code":
      return "This service is better suited for app builds, scripts, dashboard starters, and implementation handoffs."
    case "data":
      return "This service is better suited for structured exports, analytics outputs, and normalized data files."
    case "spreadsheet":
      return "This service is better suited for spreadsheet packs, tokenomics models, and planning workbooks."
    case "document":
    default:
      return "This service is better suited for written briefs, summaries, reports, and polished document-style deliverables."
  }
}

function buildRecommendedServices(input: {
  requestedArchetype: ServiceArchetype
  currentServiceId?: string | null
  currentAgentId?: string | null
  availableServices?: AgentServiceDto[]
}) {
  const services = input.availableServices ?? []

  return services
    .filter((service) => service.id !== input.currentServiceId)
    .map((service) => {
      const archetype = inferServiceArchetype({
        serviceTitle: service.title,
        serviceDescription: service.description,
        service,
      })
      const isExactMatch = archetype === input.requestedArchetype
      const isCompatibleMatch = areArchetypesCompatible(
        archetype,
        input.requestedArchetype,
      )
      const sameAgent =
        Boolean(input.currentAgentId) && service.agentId === input.currentAgentId

      return {
        service,
        archetype,
        isExactMatch,
        isCompatibleMatch,
        sameAgent,
      }
    })
    .filter((candidate) => candidate.isExactMatch || candidate.isCompatibleMatch)
    .sort((left, right) => {
      const leftScore =
        (left.isExactMatch ? 100 : 0) +
        (left.sameAgent ? 20 : 0) +
        (left.isCompatibleMatch ? 5 : 0)
      const rightScore =
        (right.isExactMatch ? 100 : 0) +
        (right.sameAgent ? 20 : 0) +
        (right.isCompatibleMatch ? 5 : 0)

      return rightScore - leftScore
    })
    .slice(0, 4)
    .map(
      (candidate) =>
        ({
          service: candidate.service,
          reason: buildRecommendationReason(candidate.archetype),
          archetype: candidate.archetype,
          archetypeLabel: getArchetypeLabel(candidate.archetype),
        }) satisfies BriefCoachServiceRecommendation,
    )
}

function buildCompetitorResearchPlan(input: {
  note: string
  references: OrderReference[]
}): BriefCoachPlan {
  const noteLower = input.note.toLowerCase()
  const hasBusinessContext = containsAny(noteLower, [
    "product",
    "company",
    "startup",
    "marketplace",
    "business",
    "saas",
    "ecommerce",
    "agency",
    "platform",
    "audience",
    "founder",
    "creator",
    "merchant",
    "customer",
    "industry",
    "niche",
    "region",
    "market",
  ])
  const hasCompetitorSources = input.references.length > 0
  const hasComparisonCriteria = containsAny(noteLower, [
    "pricing",
    "positioning",
    "messaging",
    "features",
    "audience",
    "strength",
    "weakness",
    "opportunit",
    "compare",
    "benchmark",
  ])

  const messages: BriefCoachMessage[] = []
  const actions: BriefCoachAction[] = []

  if (!hasBusinessContext) {
    messages.push({
      id: "business-context",
      tone: "warning",
      title: "Tell me what business this research is for",
      body: "Name the company, product, audience, and market you care about. If you do not know exact competitors yet, that context is enough for AgentCommerce to infer a useful shortlist.",
    })
    actions.push({
      id: "business-context-template",
      label: "Add business context",
      text: [
        "Business or product:",
        "Nature of business:",
        "Target audience:",
        "Region or market:",
      ].join("\n"),
    })
  }

  if (!hasCompetitorSources) {
    messages.push({
      id: "competitor-sources",
      tone: "warning",
      title: "Competitor names or links would sharpen this fast",
      body: "Add competitor names, homepage links, screenshots, pricing pages, or PDFs. If you have none, say the business category and AgentCommerce will narrow inferred comparable competitors instead of blocking.",
    })
    actions.push({
      id: "competitor-shortlist-template",
      label: "Add competitor shortlist",
      text: [
        "Competitor shortlist or examples:",
        "- ",
        "- ",
        "- ",
        "",
        "If exact competitor links are unavailable, infer comparable products in this category:",
      ].join("\n"),
    })
  }

  if (!hasComparisonCriteria) {
    messages.push({
      id: "comparison-criteria",
      tone: "outline",
      title: "Tell me how you want them compared",
      body: "Pricing, messaging, target users, product UX, AI features, and positioning are all fair game. A clear comparison lens makes the brief much more decision-ready.",
    })
    actions.push({
      id: "comparison-criteria-template",
      label: "Add comparison criteria",
      text: [
        "Please compare them on:",
        "- positioning and messaging",
        "- pricing",
        "- target customer",
        "- product strengths and weaknesses",
        "- opportunities for differentiation",
      ].join("\n"),
    })
  }

  const status =
    input.note.trim().length === 0
      ? "needs_brief"
      : !hasBusinessContext || !hasComparisonCriteria
        ? "needs_context"
        : "ready"

  return buildPlan({
    status,
    statusLabel:
      status === "ready"
        ? "Strong enough to proceed"
        : status === "needs_context"
          ? "Good start, but still needs context"
          : "Needs a real brief",
    summary:
      status === "ready"
        ? "This is grounded enough for a useful first-pass competitor brief. Sources would still improve accuracy."
        : "Before payment, tighten the brief with business context, comparison goals, and any competitor names or sources you already know.",
    messages:
      messages.length > 0
        ? messages
        : [
            {
              id: "ready",
              tone: "success",
              title: "This research brief has enough direction",
              body: "AgentCommerce can start with what you wrote. More competitor links or screenshots will make the result more grounded, but the assistant can already narrow the landscape and proceed.",
            },
          ],
    actions,
    suggestedAttachments: [
      "competitor homepages or pricing pages",
      "screenshots of onboarding or messaging",
      "PDF decks, strategy notes, or market docs",
      "any internal notes about who you want to beat",
    ],
    blockingMessage:
      status === "ready"
        ? null
        : "Before checkout, add the business or product context, how competitors should be compared, and any competitor names or source links you already know.",
  })
}

function buildResearchPlan(input: {
  note: string
  references: OrderReference[]
}): BriefCoachPlan {
  const noteLower = input.note.toLowerCase()
  const hasTopic = input.note.trim().length >= 40
  const hasOutcome = containsAny(noteLower, [
    "summary",
    "brief",
    "report",
    "insight",
    "recommend",
    "comparison",
    "analysis",
  ])
  const hasSources =
    input.references.length > 0 || containsAny(noteLower, ["http://", "https://"])

  const messages: BriefCoachMessage[] = []
  const actions: BriefCoachAction[] = []

  if (!hasTopic) {
    messages.push({
      id: "topic",
      tone: "warning",
      title: "Name the topic and business angle clearly",
      body: "Tell me what should be researched, for whom, and why it matters. Without that, the result may be too broad.",
    })
    actions.push({
      id: "topic-template",
      label: "Add topic context",
      text: [
        "Research topic:",
        "Business or product context:",
        "What decision this research should support:",
      ].join("\n"),
    })
  }

  if (!hasOutcome) {
    messages.push({
      id: "outcome",
      tone: "outline",
      title: "Tell me what form the answer should take",
      body: "Ask for a summary, recommendation list, comparison, or decision memo so the output lands in a useful format.",
    })
    actions.push({
      id: "outcome-template",
      label: "Add output goals",
      text: [
        "Please deliver:",
        "- a concise executive summary",
        "- key findings",
        "- recommendations",
      ].join("\n"),
    })
  }

  if (!hasSources) {
    messages.push({
      id: "sources",
      tone: "outline",
      title: "Sources are optional, but they help a lot",
      body: "If you have PDFs, links, notes, or screenshots, attach them now. If not, AgentCommerce can still produce a first pass from the brief.",
    })
  }

  const status =
    input.note.trim().length === 0
      ? "needs_brief"
      : !hasTopic || !hasOutcome
        ? "needs_context"
        : "ready"

  return buildPlan({
    status,
    statusLabel:
      status === "ready"
        ? "Ready for fulfillment"
        : status === "needs_context"
          ? "A few details will improve this"
          : "Needs a clearer brief",
    summary:
      status === "ready"
        ? "This brief is good enough for a useful first pass."
        : "A little more topic and output guidance will make the research much better.",
    messages:
      messages.length > 0
        ? messages
        : [
            {
              id: "ready",
              tone: "success",
              title: "This research brief is workable",
              body: "AgentCommerce has enough direction to start. Any attached source material will make it more grounded.",
            },
          ],
    actions,
    suggestedAttachments: [
      "links to articles, websites, or product pages",
      "PDFs or screenshots",
      "notes, transcripts, or briefs",
    ],
    blockingMessage:
      status === "ready"
        ? null
        : "Before checkout, add the research topic, business angle, and what kind of result you want back.",
  })
}

function buildDesignPlan(input: {
  note: string
  references: OrderReference[]
}): BriefCoachPlan {
  const noteLower = input.note.toLowerCase()
  const hasUseCase = containsAny(noteLower, [
    "ad",
    "hero",
    "thumbnail",
    "poster",
    "campaign",
    "landing page",
    "social",
    "banner",
    "flyer",
    "brochure",
  ])
  const hasStyle = containsAny(noteLower, [
    "modern",
    "premium",
    "minimal",
    "futuristic",
    "editorial",
    "bold",
    "playful",
    "clean",
    "dark",
    "bright",
  ])
  const hasBusinessContext = containsAny(noteLower, [
    "business",
    "brand",
    "company",
    "product",
    "startup",
    "store",
    "service",
    "restaurant",
    "agency",
    "marketplace",
    "saas",
    "app",
  ])
  const hasVisualReferences = input.references.some(
    (reference) => reference.type === "image" || reference.type === "video",
  )

  const messages: BriefCoachMessage[] = []
  const actions: BriefCoachAction[] = []

  if (!hasBusinessContext) {
    messages.push({
      id: "business-context",
      tone: "warning",
      title: "Tell me what business this is for",
      body: "For flyer, banner, poster, and campaign work, AgentCommerce needs the business, product, or offer so the draft does not feel generic.",
    })
    actions.push({
      id: "business-template",
      label: "Add business context",
      text: [
        "Business or brand name:",
        "What the business does:",
        "Main offer or message to highlight:",
      ].join("\n"),
    })
  }

  if (!hasUseCase) {
    messages.push({
      id: "use-case",
      tone: "warning",
      title: "Tell me where this design will be used",
      body: "Ad creative, flyer, hero image, poster, social post, and thumbnail all need different composition and hierarchy.",
    })
    actions.push({
      id: "use-case-template",
      label: "Add placement details",
      text: [
        "This design is for:",
        "Primary use case:",
        "Target platform or placement:",
      ].join("\n"),
    })
  }

  if (!hasStyle) {
    messages.push({
      id: "style",
      tone: "outline",
      title: "Describe the look and feel you want",
      body: "Even a few words like premium, modern, bold, minimal, or futuristic make the draft much sharper.",
    })
    actions.push({
      id: "style-template",
      label: "Add visual direction",
      text: [
        "Visual direction:",
        "- ",
        "",
        "Colors or brand notes:",
        "Do not include:",
      ].join("\n"),
    })
  }

  if (!hasVisualReferences) {
    messages.push({
      id: "visual-refs",
      tone: "outline",
      title: "Images or screenshots would help",
      body: "Logos, screenshots, moodboards, or competitor ads are optional, but they usually make the first draft much closer to what you want.",
    })
  }

  const status =
    input.note.trim().length === 0
      ? "needs_brief"
      : !hasBusinessContext || !hasUseCase || !hasStyle
        ? "needs_context"
        : "ready"

  return buildPlan({
    status,
    statusLabel:
      status === "ready"
        ? "Design brief looks solid"
        : status === "needs_context"
          ? "This needs a little more art direction"
          : "Needs a real visual brief",
    summary:
      status === "ready"
        ? "The assistant can draft visuals from this."
        : "Add the business context, where the design will be used, and the visual direction you want for a better result.",
    messages:
      messages.length > 0
        ? messages
        : [
            {
              id: "ready",
              tone: "success",
              title: "This visual brief is good enough to draft from",
              body: "AgentCommerce can move into owner review with a strong first concept from this input.",
            },
          ],
    actions,
    suggestedAttachments: [
      "logos or brand assets",
      "screenshots of the product",
      "moodboards or inspiration images",
      "reference ads or competitor creatives",
    ],
    blockingMessage:
      status === "ready"
        ? null
        : "Before checkout, add the business or offer, where the design will be used, and the visual direction you want.",
  })
}

function buildCodePlan(input: {
  note: string
  references: OrderReference[]
  kind: "code" | "contract"
}): BriefCoachPlan {
  const noteLower = input.note.toLowerCase()
  const hasScope = input.note.trim().length >= 60
  const hasTechContext = containsAny(noteLower, [
    "react",
    "next",
    "typescript",
    "node",
    "api",
    "database",
    "schema",
    "erc20",
    "staking",
    "solidity",
    "rust",
    "move",
    "wallet",
    "frontend",
    "backend",
  ])
  const hasReferences = input.references.length > 0

  const messages: BriefCoachMessage[] = []
  const actions: BriefCoachAction[] = []

  if (!hasScope) {
    messages.push({
      id: "scope",
      tone: "warning",
      title: "Define the scope of the build",
      body: "List the core features, what should be included now, and anything out of scope so the code handoff stays focused.",
    })
    actions.push({
      id: "scope-template",
      label: "Add scope",
      text: [
        "Build scope:",
        "- ",
        "",
        "Out of scope:",
        "- ",
      ].join("\n"),
    })
  }

  if (!hasTechContext) {
    messages.push({
      id: "tech-context",
      tone: "outline",
      title: `Tell me the ${input.kind === "contract" ? "chain and contract" : "stack and integrations"}`,
      body:
        input.kind === "contract"
          ? "Token standard, staking rules, reward flow, and security constraints will make the draft much more useful."
          : "Framework, APIs, schema notes, and existing code references will tighten the output fast.",
    })
    actions.push({
      id: "tech-context-template",
      label: "Add technical context",
      text:
        input.kind === "contract"
          ? [
              "Contract context:",
              "Chain / environment:",
              "Token standard:",
              "Core rules:",
              "Security assumptions:",
            ].join("\n")
          : [
              "Technical context:",
              "Preferred stack:",
              "APIs or data sources:",
              "Existing repo or schema notes:",
            ].join("\n"),
    })
  }

  if (!hasReferences) {
    messages.push({
      id: "references",
      tone: "outline",
      title: "Reference code or docs would help",
      body: "API docs, schema files, wireframes, or reference contracts are optional, but they reduce ambiguity a lot.",
    })
  }

  const status =
    input.note.trim().length === 0
      ? "needs_brief"
      : !hasScope || !hasTechContext
        ? "needs_context"
        : "ready"

  return buildPlan({
    status,
    statusLabel:
      status === "ready"
        ? "Implementation brief looks usable"
        : status === "needs_context"
          ? "A few technical details will help"
          : "Needs a build brief",
    summary:
      status === "ready"
        ? "This is strong enough for a useful starter implementation."
        : "Add scope and technical context so the generated code or contract is less generic.",
    messages:
      messages.length > 0
        ? messages
        : [
            {
              id: "ready",
              tone: "success",
              title: "This technical brief is good enough to start",
              body: "AgentCommerce can produce a strong first-pass build from this input.",
            },
          ],
    actions,
    suggestedAttachments: [
      input.kind === "contract"
        ? "reference contracts or audits"
        : "API docs or schema files",
      "wireframes or product notes",
      "existing repo snippets or examples",
    ],
    blockingMessage:
      status === "ready"
        ? null
        : input.kind === "contract"
          ? "Before checkout, add the contract scope, chain or token context, and core rules."
          : "Before checkout, add the build scope, preferred stack, and technical context.",
  })
}

function buildDataPlan(input: {
  note: string
  references: OrderReference[]
  kind: "data" | "spreadsheet"
}): BriefCoachPlan {
  const noteLower = input.note.toLowerCase()
  const hasGoal = containsAny(noteLower, [
    "analyze",
    "summary",
    "report",
    "export",
    "forecast",
    "model",
    "tokenomics",
    "roi",
    "dashboard",
  ])
  const hasColumnsOrMetrics = containsAny(noteLower, [
    "csv",
    "json",
    "column",
    "metric",
    "field",
    "revenue",
    "users",
    "orders",
    "transactions",
    "allocation",
    "emissions",
    "reward",
  ])
  const hasStructuredReferences = input.references.length > 0

  const messages: BriefCoachMessage[] = []
  const actions: BriefCoachAction[] = []

  if (!hasGoal) {
    messages.push({
      id: "goal",
      tone: "warning",
      title: "Tell me what the data work should produce",
      body: "Say whether you want an export, summary, forecast, planning model, or spreadsheet pack.",
    })
    actions.push({
      id: "goal-template",
      label: "Add data goal",
      text: [
        "Please produce:",
        "- ",
        "",
        "Key decision this should support:",
      ].join("\n"),
    })
  }

  if (!hasColumnsOrMetrics) {
    messages.push({
      id: "metrics",
      tone: "outline",
      title: "Name the important metrics or fields",
      body: "Even a short note about the key columns, KPIs, or planning variables helps the output feel much less generic.",
    })
    actions.push({
      id: "metrics-template",
      label: "Add key metrics",
      text: [
        "Important metrics / fields:",
        "- ",
        "- ",
        "- ",
      ].join("\n"),
    })
  }

  if (!hasStructuredReferences) {
    messages.push({
      id: "structured-files",
      tone: "outline",
      title: "A file upload would help a lot here",
      body: "CSV, JSON, spreadsheets, screenshots of tables, or even raw notes are all useful for a stronger output.",
    })
  }

  const status =
    input.note.trim().length === 0
      ? "needs_brief"
      : !hasGoal || !hasColumnsOrMetrics
        ? "needs_context"
        : "ready"

  return buildPlan({
    status,
    statusLabel:
      status === "ready"
        ? "Data brief looks workable"
        : status === "needs_context"
          ? "A little more structure would help"
          : "Needs a clearer data brief",
    summary:
      status === "ready"
        ? "AgentCommerce can create a strong first-pass data handoff from this."
        : "Add the goal, key metrics, and any structured files you have for a better result.",
    messages:
      messages.length > 0
        ? messages
        : [
            {
              id: "ready",
              tone: "success",
              title: "This data brief is good enough to proceed",
              body: "The assistant has enough structure to generate a useful export or planning model.",
            },
          ],
    actions,
    suggestedAttachments: [
      "CSV or JSON files",
      "spreadsheets or screenshots of tables",
      "notes explaining columns or formulas",
    ],
    blockingMessage:
      status === "ready"
        ? null
        : "Before checkout, add what this data work should produce and which metrics or fields matter most.",
  })
}

function buildDocumentPlan(input: {
  note: string
  references: OrderReference[]
}): BriefCoachPlan {
  const noteLower = input.note.toLowerCase()
  const hasAudience = containsAny(noteLower, [
    "audience",
    "customer",
    "founder",
    "creator",
    "team",
    "client",
    "buyer",
    "investor",
  ])
  const hasOutcome = containsAny(noteLower, [
    "summary",
    "brief",
    "report",
    "copy",
    "script",
    "plan",
    "description",
    "faq",
  ])
  const hasBusinessContext = containsAny(noteLower, [
    "business",
    "brand",
    "company",
    "product",
    "startup",
    "service",
    "marketplace",
    "saas",
    "store",
    "app",
  ])
  const hasReferences = input.references.length > 0

  const messages: BriefCoachMessage[] = []
  const actions: BriefCoachAction[] = []

  if (!hasBusinessContext) {
    messages.push({
      id: "business-context",
      tone: "warning",
      title: "Name the business or product",
      body: "A written deliverable works much better when AgentCommerce knows what business, offer, or product it is speaking about.",
    })
    actions.push({
      id: "business-context-template",
      label: "Add business details",
      text: [
        "Business or product:",
        "What it does:",
        "Main goal of this deliverable:",
      ].join("\n"),
    })
  }

  if (!hasAudience) {
    messages.push({
      id: "audience",
      tone: "warning",
      title: "Say who this is for",
      body: "Audience and business context make the writing much more specific and useful.",
    })
    actions.push({
      id: "audience-template",
      label: "Add audience context",
      text: [
        "Target audience:",
        "Desired tone:",
        "Where this will be used:",
      ].join("\n"),
    })
  }

  if (!hasOutcome) {
    messages.push({
      id: "outcome",
      tone: "outline",
      title: "Tell me what kind of document you want back",
      body: "A summary, report, landing page copy, strategy memo, or script all call for different structure.",
    })
    actions.push({
      id: "outcome-template",
      label: "Add output type",
      text: [
        "Desired output:",
        "Must-include points:",
      ].join("\n"),
    })
  }

  if (!hasReferences) {
    messages.push({
      id: "supporting-materials",
      tone: "outline",
      title: "Supporting materials are optional but helpful",
      body: "Links, screenshots, PDFs, and notes all help AgentCommerce produce a sharper document.",
    })
  }

  const status =
    input.note.trim().length === 0
      ? "needs_brief"
      : !hasBusinessContext || !hasAudience || !hasOutcome
        ? "needs_context"
        : "ready"

  return buildPlan({
    status,
    statusLabel:
      status === "ready"
        ? "Document brief looks usable"
        : status === "needs_context"
          ? "A bit more direction would help"
          : "Needs a stronger brief",
    summary:
      status === "ready"
        ? "This is enough for a useful first-pass written deliverable."
        : "Add the business or product, who it is for, and what kind of output you want back.",
    messages:
      messages.length > 0
        ? messages
        : [
            {
              id: "ready",
              tone: "success",
              title: "This written brief is strong enough to start",
              body: "AgentCommerce can produce a focused first-pass document from this context.",
            },
          ],
    actions,
    suggestedAttachments: [
      "source docs or PDFs",
      "links or screenshots",
      "notes, transcripts, or examples",
    ],
    blockingMessage:
      status === "ready"
        ? null
        : "Before checkout, add the business or product, who the output is for, and what kind of document you want back.",
  })
}

export function buildCheckoutBriefCoachPlan(input: {
  serviceTitle: string
  serviceDescription: string | null
  service?: AgentServiceDto | null
  serviceMetadata?: AgentServiceDto["metadata"] | null
  customerNote: string
  customerReferences: OrderReference[]
  availableServices?: AgentServiceDto[]
}): BriefCoachPlan {
  const selectedArchetype = inferServiceArchetype({
    serviceTitle: input.serviceTitle,
    serviceDescription: input.serviceDescription,
    service: input.service,
    serviceMetadata: input.serviceMetadata,
  })

  const requestedArchetype = inferRequestedArchetype(input.customerNote)
  const recommendedServices =
    requestedArchetype !== null
      ? buildRecommendedServices({
          requestedArchetype,
          currentServiceId: input.service?.id ?? null,
          currentAgentId: input.service?.agentId ?? input.service?.agent?.id ?? null,
          availableServices: input.availableServices,
        })
      : []

  const basePlan = (() => {
    switch (selectedArchetype) {
      case "competitor_research":
        return buildCompetitorResearchPlan({
          note: input.customerNote,
          references: input.customerReferences,
        })
      case "research":
        return buildResearchPlan({
          note: input.customerNote,
          references: input.customerReferences,
        })
      case "design":
        return buildDesignPlan({
          note: input.customerNote,
          references: input.customerReferences,
        })
      case "code":
        return buildCodePlan({
          note: input.customerNote,
          references: input.customerReferences,
          kind: "code",
        })
      case "contract":
        return buildCodePlan({
          note: input.customerNote,
          references: input.customerReferences,
          kind: "contract",
        })
      case "data":
        return buildDataPlan({
          note: input.customerNote,
          references: input.customerReferences,
          kind: "data",
        })
      case "spreadsheet":
        return buildDataPlan({
          note: input.customerNote,
          references: input.customerReferences,
          kind: "spreadsheet",
        })
      case "document":
      default:
        return buildDocumentPlan({
          note: input.customerNote,
          references: input.customerReferences,
        })
    }
  })()

  if (
    requestedArchetype !== null &&
    input.customerNote.trim().length > 0 &&
    !areArchetypesCompatible(selectedArchetype, requestedArchetype)
  ) {
    const requestedLabel = getArchetypeLabel(requestedArchetype)
    const selectedLabel = getArchetypeLabel(selectedArchetype)

    return buildPlan({
      status: "wrong_service",
      statusLabel: "Wrong service for this brief",
      summary: `This request sounds more like ${requestedLabel.toLowerCase()} work, but the current service is positioned for ${selectedLabel.toLowerCase()} work.`,
      messages: [
        {
          id: "service-mismatch",
          tone: "warning",
          title: `This brief sounds closer to ${requestedLabel}`,
          body:
            recommendedServices.length > 0
              ? `You can keep editing the brief to fit ${input.serviceTitle}, or switch to one of the recommended services below for a better match.`
              : `You can keep editing the brief to fit ${input.serviceTitle}, but right now it sounds like a different kind of job.`,
        },
        ...basePlan.messages.filter((message) => message.tone !== "success"),
      ],
      actions: [],
      suggestedAttachments: basePlan.suggestedAttachments,
      blockingMessage: `This brief sounds like ${requestedLabel.toLowerCase()} work, not ${selectedLabel.toLowerCase()} work. Choose a better-fit service below or rewrite the brief so it matches ${input.serviceTitle}.`,
      serviceFit: "mismatch",
      requestedServiceLabel: requestedLabel,
      selectedServiceLabel: selectedLabel,
      recommendedServices,
    })
  }

  return buildPlan({
    ...basePlan,
    serviceFit:
      requestedArchetype === null
        ? "unknown"
        : areArchetypesCompatible(selectedArchetype, requestedArchetype)
          ? "aligned"
          : "unknown",
    requestedServiceLabel:
      requestedArchetype !== null ? getArchetypeLabel(requestedArchetype) : null,
    selectedServiceLabel: getArchetypeLabel(selectedArchetype),
    recommendedServices,
  })
}

export function buildRevisionBriefCoachPlan(input: {
  serviceTitle: string
  serviceDescription: string | null
  service?: AgentServiceDto | null
  serviceMetadata?: AgentServiceDto["metadata"] | null
  originalCustomerNote?: string | null
  originalCustomerReferences?: OrderReference[]
  revisionNote: string
  revisionReferences: OrderReference[]
}): BriefCoachPlan {
  const combinedNote = [input.originalCustomerNote ?? "", input.revisionNote]
    .filter(Boolean)
    .join("\n\n")
  const combinedReferences = [
    ...(input.originalCustomerReferences ?? []),
    ...input.revisionReferences,
  ]
  const basePlan = buildCheckoutBriefCoachPlan({
    serviceTitle: input.serviceTitle,
    serviceDescription: input.serviceDescription,
    service: input.service,
    serviceMetadata: input.serviceMetadata,
    customerNote: combinedNote,
    customerReferences: combinedReferences,
  })

  const revisionLower = input.revisionNote.toLowerCase()
  const hasConcreteChange =
    input.revisionNote.trim().length >= 16 &&
    containsAny(revisionLower, [
      "change",
      "update",
      "revise",
      "fix",
      "replace",
      "add",
      "remove",
      "improve",
      "make",
      "adjust",
      "rewrite",
      "include",
      "focus",
      "narrow",
      "expand",
      "shorten",
    ])
  const mentionsWhatToKeep = containsAny(revisionLower, [
    "keep",
    "still",
    "retain",
    "leave",
    "same",
    "do not change",
  ])
  const messages: BriefCoachMessage[] = []
  const actions: BriefCoachAction[] = []

  if (input.revisionNote.trim().length === 0) {
    messages.push({
      id: "revision-empty",
      tone: "warning",
      title: "Tell me what should change",
      body: "A revision request should say what to fix, change, add, or improve in the current delivery.",
    })
    actions.push({
      id: "revision-template",
      label: "Add revision instructions",
      text: [
        "Please revise the current delivery.",
        "",
        "What should change:",
        "- ",
        "",
        "What should stay the same:",
        "- ",
      ].join("\n"),
    })
  } else if (!hasConcreteChange) {
    messages.push({
      id: "revision-specificity",
      tone: "warning",
      title: "Be more specific about the changes",
      body: "Name the exact parts that should change so the next draft does not guess.",
    })
    actions.push({
      id: "specific-changes-template",
      label: "Specify the changes",
      text: [
        "Please update the delivery with these exact changes:",
        "- ",
        "- ",
        "",
        "Priority change:",
      ].join("\n"),
    })
  }

  if (!mentionsWhatToKeep) {
    messages.push({
      id: "keep-guidance",
      tone: "outline",
      title: "Say what should stay the same too",
      body: "That helps the next draft preserve the parts you already like instead of changing too much.",
    })
    actions.push({
      id: "keep-template",
      label: "Add keep instructions",
      text: [
        "Keep these parts the same:",
        "- ",
      ].join("\n"),
    })
  }

  if (input.revisionReferences.length === 0) {
    messages.push({
      id: "revision-sources",
      tone: "outline",
      title: "New files or links can sharpen this revision",
      body: "If the next draft depends on better sources, updated screenshots, competitor links, or a new file, attach them now.",
    })
  }

  const status =
    input.revisionNote.trim().length === 0
      ? "needs_brief"
      : !hasConcreteChange || basePlan.status !== "ready"
        ? "needs_context"
        : "ready"

  return buildPlan({
    status,
    statusLabel:
      status === "ready"
        ? "Revision request looks actionable"
        : status === "needs_context"
          ? "A little more detail will help"
          : "Needs a revision note",
    summary:
      status === "ready"
        ? "This revision request gives AgentCommerce enough direction to prepare a better next draft."
        : "Tell AgentCommerce exactly what should change, what should stay, and attach any new source material that matters.",
    messages:
      [
        ...messages,
        ...basePlan.messages.filter((message) => message.tone !== "success"),
      ].length > 0
        ? [
            ...messages,
            ...basePlan.messages.filter((message) => message.tone !== "success"),
          ]
        : [
            {
              id: "revision-ready",
              tone: "success",
              title: "This revision request is clear enough to use",
              body: "The next draft should have enough guidance to improve the delivery without guessing too much.",
            },
          ],
    actions: [...actions, ...basePlan.actions],
    suggestedAttachments: basePlan.suggestedAttachments,
    blockingMessage:
      status === "ready"
        ? null
        : "Before sending the revision, describe the exact changes you want, mention what should stay the same, and attach any new supporting files or links if they matter.",
  })
}
