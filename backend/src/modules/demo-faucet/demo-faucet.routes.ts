import type { FastifyInstance } from "fastify";

import { env } from "../../config/env.js";
import { demoFaucetRequestBodySchema } from "./demo-faucet.schemas.js";
import {
  adminFundDemoWallet,
  getDemoFaucetStatus,
  requestDemoFaucetFunding,
} from "./demo-faucet.service.js";

export async function demoFaucetRoutes(app: FastifyInstance) {
  app.get("/status", async () => ({
    data: getDemoFaucetStatus(),
  }));

  app.post(
    "/request",
    env.DEMO_FAUCET_REQUIRE_AUTH
      ? {
          preHandler: app.authenticate,
        }
      : {},
    async (request) => {
      const body = demoFaucetRequestBodySchema.parse(request.body ?? {});

      return {
        data: await requestDemoFaucetFunding({
          redis: app.redis,
          body,
          auth: request.auth,
          requesterIp: request.ip ?? null,
        }),
      };
    },
  );

  app.post("/admin/fund", async (request) => {
    const body = demoFaucetRequestBodySchema.parse(request.body ?? {});

    return {
      data: await adminFundDemoWallet({
        redis: app.redis,
        body,
        requesterIp: request.ip ?? null,
        adminToken: request.headers["x-demo-faucet-token"]?.toString(),
      }),
    };
  });
}
