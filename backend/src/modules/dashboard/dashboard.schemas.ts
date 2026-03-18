import { z } from "zod";

export const dashboardStatsQuerySchema = z.object({
  ownerId: z.string().cuid().optional(),
  agentId: z.string().cuid().optional(),
  range: z.string().trim().min(2).max(16).optional().default("30d"),
});

export type DashboardStatsQuery = z.infer<typeof dashboardStatsQuerySchema>;
