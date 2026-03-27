"use client"

import { useMemo } from "react"
import { useAgents } from "@/hooks/api"

export type LandingPreviewMetric = {
  id: "active_agents" | "service_listings" | "orders_routed"
  label: string
  value: string
  description: string
}

export type LandingPreviewAgent = {
  id: string
  name: string
  category: string
  serviceCount: number
  orderCount: number
}

export function useLandingPreview() {
  const agentsQuery = useAgents({
    status: "ACTIVE",
    page: 1,
    pageSize: 6,
  })

  const agents = agentsQuery.data?.data ?? []

  const metrics = useMemo<LandingPreviewMetric[]>(() => {
    const totalAgents = agents.length
    const totalServices = agents.reduce(
      (sum, agent) => sum + agent.serviceCount,
      0,
    )
    const totalOrders = agents.reduce((sum, agent) => sum + agent.orderCount, 0)

    return [
      {
        id: "active_agents",
        label: "Active Agents",
        value: totalAgents.toString(),
        description:
          totalAgents > 0
            ? "Live agents currently published to the marketplace."
            : "No active agents yet.",
      },
      {
        id: "service_listings",
        label: "Service Listings",
        value: totalServices.toString(),
        description:
          totalServices > 0
            ? "Backend-published services available for checkout."
            : "Services will appear here once agents publish offers.",
      },
      {
        id: "orders_routed",
        label: "Orders Routed",
        value: totalOrders.toString(),
        description:
          totalOrders > 0
            ? "Orders recorded through live AgentCommerce flows."
            : "Orders will populate here after the first live checkout.",
      },
    ]
  }, [agents])

  const featuredAgents = useMemo<LandingPreviewAgent[]>(() => {
    return [...agents]
      .sort(
        (left, right) =>
          Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
      )
      .slice(0, 3)
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        category: agent.category,
        serviceCount: agent.serviceCount,
        orderCount: agent.orderCount,
      }))
  }, [agents])

  return {
    metrics,
    featuredAgents,
    isLoading: agentsQuery.isLoading,
    isFetching: agentsQuery.isFetching,
    isError: agentsQuery.isError,
    error: agentsQuery.error,
  }
}
