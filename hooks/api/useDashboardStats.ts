"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"
import type { ListDashboardStatsParams } from "@/lib/api/types"

export function useDashboardStats(
  params: ListDashboardStatsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.dashboardStats(params),
    queryFn: ({ signal }) => agentCommerceApi.listDashboardStats(params, signal),
    enabled: options.enabled ?? true,
  })
}
