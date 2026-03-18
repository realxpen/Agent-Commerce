import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";

export async function getHealthSnapshot(app: FastifyInstance) {
  const timestamp = new Date().toISOString();

  const [database, redis] = await Promise.allSettled([
    app.prisma.$queryRaw`SELECT 1`,
    app.redis.ping(),
  ]);

  const checks = {
    database: database.status === "fulfilled" ? "up" : "down",
    redis: redis.status === "fulfilled" ? "up" : "down",
  } as const;

  const status =
    checks.database === "up" && checks.redis === "up" ? "ok" : "degraded";

  return {
    status,
    service: env.SERVICE_NAME,
    timestamp,
    checks,
  };
}
