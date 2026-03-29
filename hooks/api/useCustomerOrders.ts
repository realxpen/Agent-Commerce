"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"
import type { ListCustomerOrdersParams } from "@/lib/api/types"

export function useCustomerOrders(
  customerId: string | null | undefined,
  params: ListCustomerOrdersParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.customerOrders(customerId ?? "unknown", params),
    queryFn: ({ signal }) =>
      agentCommerceApi.listCustomerOrders(customerId!, params, signal),
    enabled: Boolean(customerId) && (options.enabled ?? true),
  })
}
