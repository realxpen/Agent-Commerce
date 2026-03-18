"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"

export function useOrder(
  orderId: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.order(orderId ?? "unknown"),
    queryFn: ({ signal }) => agentCommerceApi.getOrder(orderId!, signal),
    enabled: Boolean(orderId) && (options.enabled ?? true),
  })
}
