"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"
import type { ListTransactionsParams } from "@/lib/api/types"

export function useTransactions(
  params: ListTransactionsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.transactions(params),
    queryFn: ({ signal }) => agentCommerceApi.listTransactions(params, signal),
    enabled: options.enabled ?? true,
  })
}
