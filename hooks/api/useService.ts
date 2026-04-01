"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"

export function useService(
  serviceId: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.service(serviceId ?? "unknown"),
    queryFn: ({ signal }) => agentCommerceApi.getService(serviceId!, signal),
    enabled: Boolean(serviceId) && (options.enabled ?? true),
  })
}
