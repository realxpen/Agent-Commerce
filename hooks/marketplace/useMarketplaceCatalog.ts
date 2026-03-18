"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useAgents } from "@/hooks/api"
import type { AgentDto } from "@/lib/api/types"

const allCategoriesLabel = "All Categories"

function matchesSearch(agent: AgentDto, query: string) {
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

export function useMarketplaceCatalog() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(allCategoriesLabel)
  const deferredSearchQuery = useDeferredValue(searchQuery.trim())
  const agentsQuery = useAgents({
    status: "ACTIVE",
    page: 1,
    pageSize: 48,
  })

  const agents = agentsQuery.data?.data ?? []

  const categories = useMemo(() => {
    const values = Array.from(new Set(agents.map((agent) => agent.category))).sort(
      (left, right) => left.localeCompare(right),
    )

    return [allCategoriesLabel, ...values]
  }, [agents])

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesCategory =
        selectedCategory === allCategoriesLabel ||
        agent.category === selectedCategory

      return matchesCategory && matchesSearch(agent, deferredSearchQuery)
    })
  }, [agents, deferredSearchQuery, selectedCategory])

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    agents,
    filteredAgents,
    isLoading: agentsQuery.isLoading,
    isFetching: agentsQuery.isFetching,
    isError: agentsQuery.isError,
    error: agentsQuery.error,
    refetch: agentsQuery.refetch,
  }
}
