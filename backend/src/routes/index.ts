import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { agentRoutes } from "../modules/agents/agents.routes.js";
import { aiTaskRoutes } from "../modules/ai-tasks/ai-tasks.routes.js";
import { artifactRoutes } from "../modules/artifacts/artifacts.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { contractEventRoutes } from "../modules/contract-events/contract-events.routes.js";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes.js";
import { demoFaucetRoutes } from "../modules/demo-faucet/demo-faucet.routes.js";
import { healthRoutes } from "../modules/health/health.routes.js";
import { orderRoutes } from "../modules/orders/orders.routes.js";
import { paymentRoutes } from "../modules/payments/payments.routes.js";
import { sessionApprovalRoutes } from "../modules/session-approvals/session-approvals.routes.js";
import { serviceRoutes } from "../modules/services/services.routes.js";
import { uploadRoutes } from "../modules/uploads/uploads.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  app.get("/", async () => ({
    name: env.SERVICE_NAME,
    status: "ok",
    apiPrefix: env.API_PREFIX,
  }));

  await app.register(
    async (api) => {
      await api.register(agentRoutes, {
        prefix: "/agents",
      });

      await api.register(authRoutes, {
        prefix: "/auth",
      });

      await api.register(aiTaskRoutes, {
        prefix: "/ai-tasks",
      });

      await api.register(artifactRoutes, {
        prefix: "/artifacts",
      });

      await api.register(contractEventRoutes, {
        prefix: "/contract-events",
      });

      await api.register(dashboardRoutes, {
        prefix: "/dashboard",
      });

      await api.register(demoFaucetRoutes, {
        prefix: "/demo-faucet",
      });

      await api.register(orderRoutes, {
        prefix: "/orders",
      });

      await api.register(paymentRoutes, {
        prefix: "/payments",
      });

      await api.register(sessionApprovalRoutes, {
        prefix: "/session-approvals",
      });

      await api.register(uploadRoutes, {
        prefix: "/uploads",
      });

      await api.register(serviceRoutes);

      await api.register(healthRoutes, {
        prefix: "/health",
      });
    },
    {
      prefix: env.API_PREFIX,
    },
  );
}
