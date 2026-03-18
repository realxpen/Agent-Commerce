import type {
  ListAgentsParams,
  ListDashboardStatsParams,
  ListServicesParams,
  ListTasksParams,
  ListTransactionsParams,
} from "@/lib/api/types"

export const apiQueryKeys = {
  agents: (params: ListAgentsParams = {}) => ["api", "agents", params] as const,
  agent: (agentId: string) => ["api", "agents", agentId] as const,
  services: (params: ListServicesParams = {}) => ["api", "services", params] as const,
  order: (orderId: string) => ["api", "orders", orderId] as const,
  dashboardStats: (params: ListDashboardStatsParams = {}) =>
    ["api", "dashboard-stats", params] as const,
  transactions: (params: ListTransactionsParams = {}) =>
    ["api", "transactions", params] as const,
  tasks: (params: ListTasksParams = {}) => ["api", "tasks", params] as const,
}
