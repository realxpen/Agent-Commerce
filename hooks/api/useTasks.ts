"use client"

import { useQuery } from "@tanstack/react-query"
import { apiQueryKeys } from "@/hooks/api/query-keys"
import { agentCommerceApi } from "@/lib/api/client"
import type { ListTasksParams } from "@/lib/api/types"

export function useTasks(
  params: ListTasksParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: apiQueryKeys.tasks(params),
    queryFn: ({ signal }) => agentCommerceApi.listTasks(params, signal),
    enabled: options.enabled ?? true,
  })
}
