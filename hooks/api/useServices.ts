"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"
import type { ListServicesParams } from "@/lib/api/types"

export function useServices(
  params: ListServicesParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.services(params),
    queryFn: ({ signal }) => agentCommerceApi.listServices(params, signal),
    enabled: options.enabled ?? true,
  })
}
