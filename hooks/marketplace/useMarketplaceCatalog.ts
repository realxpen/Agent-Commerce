"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useAgents, useServices } from "@/hooks/api"
import { usePublicBackendAvailability } from "@/hooks/deployment/usePublicBackendAvailability"
import type { AgentDto, AgentServiceDto } from "@/lib/api/types"
import {
  demoMarketplaceAgents,
  demoMarketplaceServices,
} from "@/lib/marketplace/demo-catalog"
import {
  allMarketplaceCategoriesLabel,
  getMarketplaceDiscoveryCategory,
  getMarketplaceServiceSocialHeadline,
  getMarketplaceServiceSocialNote,
  getMarketplaceServiceVisual,
  marketplaceCategoryDefinitions,
  type MarketplaceServiceVisual,
} from "@/lib/marketplace/service-presentation"
import {
  getServiceDeliverableDefinitionFromMetadata,
} from "@/lib/services/deliverable-profile"
import {
  getServiceExecutionMode,
  getServiceExecutionModeDefinition,
} from "@/lib/services/execution-mode"
import { filterWorkingPresetServices } from "@/lib/services/presets"

export type MarketplaceAgentSummary = {
  id: string
  name: string
  slug: string
  category: string
  pricingModel: AgentDto["pricingModel"]
  treasuryAddress: string
  initUsername: string | null
  description: string
  status: AgentDto["status"]
  orderCount: number
  serviceCount: number
}

export type MarketplaceCatalogService = AgentServiceDto & {
  marketAgent: MarketplaceAgentSummary | null
  discoveryCategory: string
  deliverableLabel: string
  deliverableAutomationLabel: string
  executionModeLabel: string
  trendScore: number
  activitySignal: number
  socialHeadline: string
  socialNote: string
  visual: MarketplaceServiceVisual
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function buildAgentSummary(
  agent: AgentDto | null | undefined,
  service: AgentServiceDto,
): MarketplaceAgentSummary | null {
  if (agent) {
    return {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      category: agent.category,
      pricingModel: agent.pricingModel,
      treasuryAddress: agent.treasuryAddress,
      initUsername: agent.initUsername,
      description: agent.description,
      status: agent.status,
      orderCount: agent.orderCount,
      serviceCount: agent.serviceCount,
    }
  }

  if (!service.agent) {
    return null
  }

  return {
    id: service.agent.id,
    name: service.agent.name,
    slug: service.agent.slug,
    category: service.agent.category,
    pricingModel: service.agent.pricingModel,
    treasuryAddress: service.agent.treasuryAddress,
    initUsername: null,
    description: "",
    status: "ACTIVE",
    orderCount: 0,
    serviceCount: 0,
  }
}

function matchesSearch(service: MarketplaceCatalogService, query: string) {
  if (!query) {
    return true
  }

  const value = query.toLowerCase()
  const agentHandle = service.marketAgent?.initUsername
    ? `@${service.marketAgent.initUsername}`
    : ""

  return [
    service.title,
    service.description,
    service.discoveryCategory,
    service.deliverableLabel,
    service.executionModeLabel,
    service.marketAgent?.name,
    service.marketAgent?.category,
    service.marketAgent?.slug,
    agentHandle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(value)
}

function matchesAgentSearch(agent: AgentDto, query: string) {
  if (!query) {
    return true
  }

  const value = query.toLowerCase()
  const username = agent.initUsername ? `@${agent.initUsername}` : ""

  return [agent.name, agent.category, agent.description, agent.slug, username]
    .join(" ")
    .toLowerCase()
    .includes(value)
}

function getTrendScore(service: AgentServiceDto, agent: MarketplaceAgentSummary | null) {
  const deliverySpeedScore = service.estimatedDeliveryMinutes
    ? Math.max(0, 240 - Math.min(service.estimatedDeliveryMinutes, 240)) / 24
    : 4
  const orderScore = (agent?.orderCount ?? 0) * 1.8
  const serviceDepthScore = (agent?.serviceCount ?? 0) * 1.2
  const freshnessHours =
    Math.max(0, Date.now() - new Date(service.createdAt).getTime()) / (1000 * 60 * 60)
  const freshnessScore = Math.max(0, 18 - Math.min(freshnessHours, 18)) / 2

  return orderScore + serviceDepthScore + deliverySpeedScore + freshnessScore
}

function getActivitySignal(service: AgentServiceDto, agent: MarketplaceAgentSummary | null) {
  const base =
    4 +
    Math.min(
      0.95,
      (agent?.orderCount ?? 0) * 0.035 +
        (agent?.serviceCount ?? 0) * 0.025 +
        (service.estimatedDeliveryMinutes && service.estimatedDeliveryMinutes <= 120 ? 0.08 : 0),
    )

  return Math.min(4.95, Number(base.toFixed(1)))
}

export function useMarketplaceCatalog() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(allMarketplaceCategoriesLabel)
  const deferredSearchQuery = useDeferredValue(searchQuery.trim())
  const backendAvailability = usePublicBackendAvailability()
  const shouldUseLiveCatalog = backendAvailability.canUseLiveData

  const agentsQuery = useAgents({
    status: "ACTIVE",
    page: 1,
    pageSize: 50,
  }, {
    enabled: shouldUseLiveCatalog,
  })
  const servicesQuery = useServices({
    status: "ACTIVE",
    page: 1,
    pageSize: 50,
  }, {
    enabled: shouldUseLiveCatalog,
  })

  const agents = useMemo(
    () =>
      shouldUseLiveCatalog
        ? agentsQuery.data?.data ?? []
        : [...demoMarketplaceAgents],
    [agentsQuery.data?.data, shouldUseLiveCatalog],
  )
  const services = useMemo(
    () =>
      filterWorkingPresetServices(
        shouldUseLiveCatalog
          ? servicesQuery.data?.data ?? []
          : [...demoMarketplaceServices],
      ),
    [servicesQuery.data?.data, shouldUseLiveCatalog],
  )

  const agentsById = useMemo(() => {
    return new Map(agents.map((agent) => [agent.id, agent]))
  }, [agents])

  const enrichedServices = useMemo<MarketplaceCatalogService[]>(() => {
    return services
      .map((service) => {
        const marketAgent = buildAgentSummary(agentsById.get(service.agentId), service)
        const deliverableDefinition = getServiceDeliverableDefinitionFromMetadata(service.metadata)
        const executionMode = getServiceExecutionMode(service.metadata)
        const executionModeDefinition = getServiceExecutionModeDefinition(executionMode)
        const discoveryCategory = getMarketplaceDiscoveryCategory(service, marketAgent)

        return {
          ...service,
          marketAgent,
          discoveryCategory,
          deliverableLabel: deliverableDefinition.label,
          deliverableAutomationLabel: deliverableDefinition.automationLabel,
          executionModeLabel: executionModeDefinition.label,
          trendScore: getTrendScore(service, marketAgent),
          activitySignal: getActivitySignal(service, marketAgent),
          socialHeadline: getMarketplaceServiceSocialHeadline(
            service,
            discoveryCategory,
            marketAgent,
          ),
          socialNote: getMarketplaceServiceSocialNote(service, discoveryCategory),
          visual: getMarketplaceServiceVisual(service, {
            discoveryCategory,
          }),
        }
      })
      .sort((left, right) => right.trendScore - left.trendScore)
  }, [agentsById, services])

  const marketplaceAgents = useMemo(() => {
    const visibleAgentIds = new Set(enrichedServices.map((service) => service.agentId))

    return agents.filter((agent) => visibleAgentIds.has(agent.id))
  }, [agents, enrichedServices])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()

    for (const service of enrichedServices) {
      counts.set(
        service.discoveryCategory,
        (counts.get(service.discoveryCategory) ?? 0) + 1,
      )
    }

    return [
      {
        label: allMarketplaceCategoriesLabel,
        count: enrichedServices.length,
        description: "Every live service currently available on the marketplace.",
      },
      ...marketplaceCategoryDefinitions
        .map((definition) => ({
          label: definition.label,
          count: counts.get(definition.label) ?? 0,
          description: definition.description,
        }))
        .filter((category) => category.count > 0),
    ]
  }, [enrichedServices])

  const filteredServices = useMemo(() => {
    return enrichedServices.filter((service) => {
      const matchesCategory =
        selectedCategory === allMarketplaceCategoriesLabel ||
        service.discoveryCategory === selectedCategory

      return matchesCategory && matchesSearch(service, deferredSearchQuery)
    })
  }, [deferredSearchQuery, enrichedServices, selectedCategory])

  const filteredAgentIds = useMemo(() => {
    return new Set(filteredServices.map((service) => service.agentId))
  }, [filteredServices])

  const filteredAgents = useMemo(() => {
    return marketplaceAgents
      .filter((agent) => {
        const matchesCategory =
          selectedCategory === allMarketplaceCategoriesLabel ||
          filteredAgentIds.has(agent.id) ||
          normalizeText(agent.category) === normalizeText(selectedCategory)

        return matchesCategory && matchesAgentSearch(agent, deferredSearchQuery)
      })
      .sort((left, right) => {
        const leftScore = left.orderCount * 2 + left.serviceCount
        const rightScore = right.orderCount * 2 + right.serviceCount
        return rightScore - leftScore
      })
  }, [deferredSearchQuery, filteredAgentIds, marketplaceAgents, selectedCategory])

  const servicesByAgent = useMemo(() => {
    const map = new Map<string, MarketplaceCatalogService[]>()

    for (const service of enrichedServices) {
      const current = map.get(service.agentId) ?? []
      current.push(service)
      current.sort((left, right) => right.trendScore - left.trendScore)
      map.set(service.agentId, current)
    }

    return map
  }, [enrichedServices])

  const trendingServices = useMemo(() => {
    return filteredServices.slice(0, 6)
  }, [filteredServices])

  const freshServices = useMemo(() => {
    return filteredServices
      .slice()
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, 6)
  }, [filteredServices])

  const recommendedServices = useMemo(() => {
    if (deferredSearchQuery) {
      return filteredServices.slice(0, 8)
    }

    return enrichedServices
      .filter((service) => service.deliverableAutomationLabel !== "AI runner next")
      .slice(0, 8)
  }, [deferredSearchQuery, enrichedServices, filteredServices])

  const featuredAgents = useMemo(() => {
    const agentIds = new Set(trendingServices.map((service) => service.agentId))
    const priorityAgents = filteredAgents.filter((agent) => agentIds.has(agent.id))
    const fallbackAgents = filteredAgents.filter((agent) => !agentIds.has(agent.id))

    return [...priorityAgents, ...fallbackAgents].slice(0, 6)
  }, [filteredAgents, trendingServices])

  const discoveryLanes = useMemo(() => {
    const lanes = categories
      .filter((category) => category.label !== allMarketplaceCategoriesLabel)
      .map((category) => ({
        label: category.label,
        description: category.description,
        items: enrichedServices
          .filter((service) => service.discoveryCategory === category.label)
          .slice(0, 4),
      }))
      .filter((lane) => lane.items.length > 0)

    return lanes.slice(0, 5)
  }, [categories, enrichedServices])

  const spotlightCategory = useMemo(() => {
    return (
      categories.find((category) => category.label === selectedCategory) ??
      categories[0] ?? {
        label: allMarketplaceCategoriesLabel,
        count: 0,
        description: "Every live service currently available on the marketplace.",
      }
    )
  }, [categories, selectedCategory])

  const metrics = useMemo(() => {
    const aiReadyCount = enrichedServices.filter(
      (service) => service.deliverableAutomationLabel !== "AI runner next",
    ).length
    const ownerReviewCount = enrichedServices.filter(
      (service) => normalizeText(service.executionModeLabel).includes("owner review"),
    ).length
    const totalOrders = marketplaceAgents.reduce(
      (sum, agent) => sum + agent.orderCount,
      0,
    )

    return {
      totalAgents: marketplaceAgents.length,
      totalServices: enrichedServices.length,
      totalOrders,
      aiReadyCount,
      ownerReviewCount,
    }
  }, [enrichedServices, marketplaceAgents])

  const isLoading =
    backendAvailability.isChecking ||
    (shouldUseLiveCatalog && (agentsQuery.isLoading || servicesQuery.isLoading))
  const isFetching =
    (shouldUseLiveCatalog && (agentsQuery.isFetching || servicesQuery.isFetching)) ||
    backendAvailability.isChecking
  const isError =
    shouldUseLiveCatalog && (agentsQuery.isError || servicesQuery.isError)
  const error = shouldUseLiveCatalog
    ? agentsQuery.error ?? servicesQuery.error
    : null

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    spotlightCategory,
    agents: marketplaceAgents,
    services: enrichedServices,
    filteredAgents,
    filteredServices,
    featuredAgents,
    trendingServices,
    freshServices,
    recommendedServices,
    discoveryLanes,
    servicesByAgent,
    metrics,
    backendAvailability,
    isDemoMode: !shouldUseLiveCatalog,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: async () => {
      await Promise.all([
        backendAvailability.refetch(),
        shouldUseLiveCatalog ? agentsQuery.refetch() : Promise.resolve(null),
        shouldUseLiveCatalog ? servicesQuery.refetch() : Promise.resolve(null),
      ])
    },
  }
}
