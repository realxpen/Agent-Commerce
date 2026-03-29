"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"
import type { ListOwnerOrdersParams } from "@/lib/api/types"

export function useOwnerOrders(
  ownerId: string | null | undefined,
  params: ListOwnerOrdersParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.ownerOrders(ownerId ?? "unknown", params),
    queryFn: ({ signal }) =>
      agentCommerceApi.listOwnerOrders(ownerId!, params, signal),
    enabled: Boolean(ownerId) && (options.enabled ?? true),
  })
}
