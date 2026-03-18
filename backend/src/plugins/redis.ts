import fp from "fastify-plugin";

import { createRedisClient } from "../lib/redis.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: ReturnType<typeof createRedisClient>;
  }
}

export default fp(
  async (app) => {
    const redis = createRedisClient();
    await redis.ping();

    app.decorate("redis", redis);

    app.addHook("onClose", async () => {
      await redis.quit();
    });
  },
  {
    name: "redis",
  },
);
