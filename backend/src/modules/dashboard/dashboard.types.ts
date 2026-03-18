export type DashboardStatsDto = {
  range: string;
  totals: {
    totalAgents: number;
    activeAgents: number;
    totalOrders: number;
    paidOrders: number;
    totalTransactions: number;
    totalTasks: number;
    grossRevenue: string;
    netRevenue: string;
    pendingRevenue: string;
  };
  treasury: {
    availableBalance: string;
    pendingBalance: string;
    denom: string | null;
  };
  trends: Array<{
    label: string;
    grossRevenue: string;
    netRevenue: string;
    orderCount: number;
    paymentCount: number;
  }>;
};
