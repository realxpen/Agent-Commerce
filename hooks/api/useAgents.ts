"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"
import type { ListAgentsParams } from "@/lib/api/types"

export function useAgents(
  params: ListAgentsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.agents(params),
    queryFn: ({ signal }) => agentCommerceApi.listAgents(params, signal),
    enabled: options.enabled ?? true,
  })
}
