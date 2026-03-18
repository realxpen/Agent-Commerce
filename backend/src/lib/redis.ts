import { Redis } from "ioredis";

import { env } from "../config/env.js";

export function createRedisClient() {
  return new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });
}

export function getBullMqConnection() {
  const redisUrl = new URL(env.REDIS_URL);
  const dbPath = redisUrl.pathname.replace("/", "");

  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: dbPath ? Number(dbPath) : 0,
    tls: redisUrl.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null as null,
  };
}
