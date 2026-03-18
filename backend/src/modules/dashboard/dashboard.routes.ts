import type { FastifyInstance } from "fastify";

import { assertUserMatches } from "../auth/auth.service.js";
import { dashboardStatsQuerySchema } from "./dashboard.schemas.js";
import { getDashboardStats } from "./dashboard.service.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    "/stats",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const query = dashboardStatsQuerySchema.parse(request.query ?? {});
      const ownerId = query.ownerId ?? request.auth!.userId;

      if (query.ownerId) {
        assertUserMatches(
          request.auth!.userId,
          query.ownerId,
          "You can only view stats for your own workspace",
        );
      }

      return {
        data: await getDashboardStats(app.prisma, ownerId, query),
      };
    },
  );
}
