import { Worker, type Job } from "bullmq";

import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { JOB_NAMES, type QueueJobMap } from "./jobs/index.js";
import { processAiTaskJob } from "./jobs/processors/ai-task.processor.js";
import { getBullMqConnection } from "./lib/redis.js";
import { logger } from "./lib/logger.js";
import { closeQueues, createQueues, QUEUE_NAMES } from "./queues/index.js";
import { registerShutdownHooks } from "./utils/shutdown.js";

async function start() {
  const connection = getBullMqConnection();
  const queues = createQueues();

  await prisma.$connect();

  const aiTaskWorker = new Worker(
    QUEUE_NAMES.aiTasks,
    async (job: Job) => {
      logger.info(
        {
          queue: job.queueName,
          jobId: job.id,
          jobName: job.name,
        },
        "Received BullMQ job",
      );

      switch (job.name) {
        case JOB_NAMES.aiTasks.execute:
          return processAiTaskJob(job as Job<QueueJobMap["ai.execute"]>, {
            prisma,
            queues,
          });
        default:
          logger.warn(
            {
              queue: job.queueName,
              jobId: job.id,
              jobName: job.name,
            },
            "Ignoring unknown BullMQ job name",
          );
          return null;
      }
    },
    {
      connection,
      prefix: env.REDIS_PREFIX,
      concurrency: 4,
    },
  );

  aiTaskWorker.on("completed", (job) => {
    logger.info(
      {
        queue: aiTaskWorker.name,
        jobId: job?.id,
        jobName: job?.name,
      },
      "Job completed",
    );
  });

  aiTaskWorker.on("failed", (job, error) => {
    logger.error(
      {
        queue: aiTaskWorker.name,
        jobId: job?.id,
        jobName: job?.name,
        err: error,
      },
      "Job failed",
    );
  });

  logger.info(
    {
      queues: [QUEUE_NAMES.aiTasks],
      redisPrefix: env.REDIS_PREFIX,
    },
    "BullMQ AI task worker started",
  );

  registerShutdownHooks({
    name: "worker",
    log: logger,
    close: async () => {
      await aiTaskWorker.close();
      await closeQueues(queues);
      await prisma.$disconnect();
    },
  });
}

void start();
