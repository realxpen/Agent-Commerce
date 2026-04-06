import type { AgentDto, AgentServiceDto } from "@/lib/api/types"
import { workingServicePresets } from "@/lib/services/presets"
import { buildServiceFulfillmentMetadata } from "@/lib/services/execution-mode"

type DemoAgentSeed = {
  id: string
  ownerId: string
  name: string
  slug: string
  category: string
  description: string
  initUsername: string
  treasuryAddress: string
  serviceCount: number
  orderCount: number
  createdAt: string
  updatedAt: string
}

const demoAgentSeeds: Record<string, DemoAgentSeed> = {
  signalOps: {
    id: "demo-agent-signal-ops",
    ownerId: "demo-owner-signal-ops",
    name: "Signal Ops",
    slug: "signal-ops",
    category: "Data & Analytics",
    description:
      "Turns exports, planning sheets, and business context into structured operating outputs for founders and teams.",
    initUsername: "signalops",
    treasuryAddress: "init1signalops7m5t2t9qf0pmj0sazxq0c3f4p7g6n8x2c",
    serviceCount: 2,
    orderCount: 18,
    createdAt: "2026-03-12T09:00:00.000Z",
    updatedAt: "2026-04-04T18:10:00.000Z",
  },
  atlasResearch: {
    id: "demo-agent-atlas-research",
    ownerId: "demo-owner-atlas-research",
    name: "Atlas Research",
    slug: "atlas-research",
    category: "Research & Strategy",
    description:
      "Produces grounded competitor and market research briefs that are easy to review, quote, and act on.",
    initUsername: "atlasresearch",
    treasuryAddress: "init1atlasr4v5q9xh5h8n9gm2vkw8fd7w9j6h2uv0r5",
    serviceCount: 1,
    orderCount: 11,
    createdAt: "2026-03-10T08:30:00.000Z",
    updatedAt: "2026-04-03T16:20:00.000Z",
  },
  launchframe: {
    id: "demo-agent-launchframe",
    ownerId: "demo-owner-launchframe",
    name: "Launchframe Studio",
    slug: "launchframe-studio",
    category: "Ads & Flyers",
    description:
      "Packages ad-ready creative concepts and campaign visuals for launch teams, creators, and operators.",
    initUsername: "launchframe",
    treasuryAddress: "init1launchf9e4h7m3v8yc4a7u20d8xkrlf6fj5a0x92",
    serviceCount: 1,
    orderCount: 13,
    createdAt: "2026-03-11T12:15:00.000Z",
    updatedAt: "2026-04-04T12:45:00.000Z",
  },
  stackFoundry: {
    id: "demo-agent-stack-foundry",
    ownerId: "demo-owner-stack-foundry",
    name: "Stack Foundry",
    slug: "stack-foundry",
    category: "Code & Contracts",
    description:
      "Ships starter apps, smart contract drafts, and implementation-ready technical packages.",
    initUsername: "stackfoundry",
    treasuryAddress: "init1stackf0undry9c7a4m2fh6r0s43x3u7r3pn0n8w",
    serviceCount: 2,
    orderCount: 15,
    createdAt: "2026-03-09T10:45:00.000Z",
    updatedAt: "2026-04-05T09:10:00.000Z",
  },
}

const demoAgentAssignments: Record<string, keyof typeof demoAgentSeeds> = {
  "structured-export": "signalOps",
  "tokenomics-sheet": "signalOps",
  "competitor-brief": "atlasResearch",
  "visual-draft-kit": "launchframe",
  "staking-contract": "stackFoundry",
  "dashboard-starter": "stackFoundry",
}

const demoServiceTimestamps: Record<string, string> = {
  "structured-export": "2026-04-05T10:30:00.000Z",
  "competitor-brief": "2026-04-04T13:10:00.000Z",
  "visual-draft-kit": "2026-04-04T18:25:00.000Z",
  "staking-contract": "2026-04-03T14:00:00.000Z",
  "dashboard-starter": "2026-04-02T16:45:00.000Z",
  "tokenomics-sheet": "2026-04-01T11:20:00.000Z",
}

function createDemoAgent(seed: DemoAgentSeed): AgentDto {
  return {
    id: seed.id,
    ownerId: seed.ownerId,
    name: seed.name,
    slug: seed.slug,
    category: seed.category,
    description: seed.description,
    pricingModel: "FIXED_PRICE",
    appchainId: "agentcommerce-1",
    contractAddress: null,
    treasuryAddress: seed.treasuryAddress,
    status: "ACTIVE",
    initUsername: seed.initUsername,
    metadata: {
      previewOnly: true,
    },
    serviceCount: seed.serviceCount,
    orderCount: seed.orderCount,
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
  }
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function createDemoService(preset: (typeof workingServicePresets)[number]): AgentServiceDto {
  const agentSeed = demoAgentSeeds[demoAgentAssignments[preset.id]]

  return {
    id: `demo-${preset.id}`,
    agentId: agentSeed.id,
    slug: toSlug(preset.title),
    title: preset.title,
    description: `${preset.description} ${preset.expectedOutput}`,
    status: "ACTIVE",
    pricing: {
      amount: preset.priceAmount,
      currency: null,
      denom: "GAS",
    },
    estimatedDeliveryMinutes: Number(preset.estimatedDeliveryMinutes),
    metadata: {
      previewOnly: true,
      fulfillment: buildServiceFulfillmentMetadata(
        preset.executionMode,
        preset.deliverableType,
      ),
      marketplace: {
        spotlight: preset.spotlight,
        expectedOutput: preset.expectedOutput,
      },
    },
    createdAt: demoServiceTimestamps[preset.id],
    updatedAt: demoServiceTimestamps[preset.id],
    agent: {
      id: agentSeed.id,
      name: agentSeed.name,
      slug: agentSeed.slug,
      category: agentSeed.category,
      pricingModel: "FIXED_PRICE",
      treasuryAddress: agentSeed.treasuryAddress,
    },
  }
}

export const demoMarketplaceAgents: readonly AgentDto[] = Object.values(
  demoAgentSeeds,
).map(createDemoAgent)

export const demoMarketplaceServices: readonly AgentServiceDto[] =
  workingServicePresets.map(createDemoService)

export function findDemoMarketplaceServiceById(id: string | null | undefined) {
  return demoMarketplaceServices.find((service) => service.id === id) ?? null
}

export function findDemoMarketplaceAgentById(id: string | null | undefined) {
  return demoMarketplaceAgents.find((agent) => agent.id === id) ?? null
}
