import type { Job } from "bullmq";
import type { PrismaClient } from "@prisma/client";

import type { QueueJobMap } from "../index.js";
import type { AppQueues } from "../../queues/index.js";
import { processTaskRun } from "../../modules/ai-tasks/task-run.service.js";

export async function processAiTaskJob(
  job: Job<QueueJobMap["ai.execute"]>,
  deps: {
    prisma: PrismaClient;
    queues: AppQueues;
  },
) {
  return processTaskRun(deps.prisma, deps.queues, job.data.taskRunId);
}
