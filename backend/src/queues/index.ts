import { Queue } from "bullmq";

import { env } from "../config/env.js";
import { getBullMqConnection } from "../lib/redis.js";

export const QUEUE_NAMES = {
  orders: "orders",
  payments: "payments",
  aiTasks: "ai-tasks",
  webhooks: "webhooks",
  indexing: "indexing",
} as const;

const defaultJobOptions = {
  attempts: 3,
  removeOnComplete: 100,
  removeOnFail: 500,
  backoff: {
    type: "exponential" as const,
    delay: 1_000,
  },
};

export function createQueues() {
  const connection = getBullMqConnection();

  return {
    orders: new Queue(QUEUE_NAMES.orders, {
      connection,
      prefix: env.REDIS_PREFIX,
      defaultJobOptions,
    }),
    payments: new Queue(QUEUE_NAMES.payments, {
      connection,
      prefix: env.REDIS_PREFIX,
      defaultJobOptions,
    }),
    aiTasks: new Queue(QUEUE_NAMES.aiTasks, {
      connection,
      prefix: env.REDIS_PREFIX,
      defaultJobOptions,
    }),
    webhooks: new Queue(QUEUE_NAMES.webhooks, {
      connection,
      prefix: env.REDIS_PREFIX,
      defaultJobOptions,
    }),
    indexing: new Queue(QUEUE_NAMES.indexing, {
      connection,
      prefix: env.REDIS_PREFIX,
      defaultJobOptions,
    }),
  };
}

export type AppQueues = ReturnType<typeof createQueues>;

export async function closeQueues(queues: AppQueues) {
  await Promise.all(Object.values(queues).map(async (queue) => queue.close()));
}
