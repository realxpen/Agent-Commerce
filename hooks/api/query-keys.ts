import type {
  ListAgentsParams,
  ListCustomerOrdersParams,
  ListDashboardStatsParams,
  ListOwnerOrdersParams,
  ListServicesParams,
  ListTasksParams,
  ListTransactionsParams,
} from "@/lib/api/types"

export const apiQueryKeys = {
  agents: (params: ListAgentsParams = {}) => ["api", "agents", params] as const,
  agent: (agentId: string) => ["api", "agents", agentId] as const,
  services: (params: ListServicesParams = {}) => ["api", "services", params] as const,
  order: (orderId: string) => ["api", "orders", orderId] as const,
  customerOrders: (
    customerId: string,
    params: ListCustomerOrdersParams = {},
  ) => ["api", "orders", "customer", customerId, params] as const,
  ownerOrders: (
    ownerId: string,
    params: ListOwnerOrdersParams = {},
  ) => ["api", "orders", "owner", ownerId, params] as const,
  dashboardStats: (params: ListDashboardStatsParams = {}) =>
    ["api", "dashboard-stats", params] as const,
  transactions: (params: ListTransactionsParams = {}) =>
    ["api", "transactions", params] as const,
  tasks: (params: ListTasksParams = {}) => ["api", "tasks", params] as const,
}
