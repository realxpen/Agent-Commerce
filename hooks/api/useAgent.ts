"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"

export function useAgent(
  agentId: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.agent(agentId ?? "unknown"),
    queryFn: ({ signal }) => agentCommerceApi.getAgent(agentId!, signal),
    enabled: Boolean(agentId) && (options.enabled ?? true),
  })
}
