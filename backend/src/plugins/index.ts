import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import authPlugin from "./auth.js";
import prismaPlugin from "./prisma.js";
import queuesPlugin from "./queues.js";
import redisPlugin from "./redis.js";

export async function registerPlugins(app: FastifyInstance) {
  const origins =
    env.CORS_ORIGIN === "*"
      ? true
      : env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

  await app.register(cors, {
    origin: origins,
    credentials: true,
  });

  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(queuesPlugin);
  await app.register(authPlugin);
}
