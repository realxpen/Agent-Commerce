import { Prisma, TaskRunStatus, type PrismaClient } from "@prisma/client";

import type { AppQueues } from "../../queues/index.js";
import { logger } from "../../lib/logger.js";
import { executeTaskRunWithLlm } from "../../services/ai-task-executor.service.js";
import { TaskExecutionError } from "../../services/llm/llm.errors.js";
import {
  findTaskRunOrThrow,
  markOrderDeliveredFromTask,
  markOrderFailedForTask,
  markOrderInProgressForTask,
  touchAgentTaskLastRun,
  updateTaskRunRecord,
} from "./ai-tasks.repository.js";
import { triggerTaskProcessingForOrder } from "./task.service.js";

function asInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getRetryDelayMs(attemptNumber: number) {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attemptNumber - 1));
}

export async function processTaskRun(
  db: PrismaClient,
  queues: AppQueues,
  taskRunId: string,
) {
  const taskRun = await findTaskRunOrThrow(db, taskRunId);

  if (taskRun.status === TaskRunStatus.CANCELED || taskRun.status === TaskRunStatus.SUCCEEDED) {
    logger.info(
      {
        taskRunId: taskRun.id,
        status: taskRun.status,
      },
      "Skipping task run that is already terminal",
    );
    return taskRun;
  }

  const runningTaskRun = await db.$transaction(async (tx) => {
    const currentRun = await findTaskRunOrThrow(tx, taskRunId);

    if (currentRun.status !== TaskRunStatus.QUEUED) {
      return currentRun;
    }

    const startedRun = await updateTaskRunRecord(tx, currentRun.id, {
      status: TaskRunStatus.RUNNING,
      startedAt: currentRun.startedAt ?? new Date(),
      errorMessage: null,
      errorDetails: Prisma.DbNull,
      nextRetryAt: null,
    });

    if (startedRun.orderId) {
      await markOrderInProgressForTask(tx, startedRun.orderId);
    }

    return startedRun;
  });

  if (runningTaskRun.status !== TaskRunStatus.RUNNING) {
    return runningTaskRun;
  }

  try {
    const executionResult = await executeTaskRunWithLlm(runningTaskRun);

    const completedRun = await db.$transaction(async (tx) => {
      const updatedRun = await updateTaskRunRecord(tx, runningTaskRun.id, {
        status: TaskRunStatus.SUCCEEDED,
        output: executionResult.persistedOutput,
        completedAt: new Date(),
        errorMessage: null,
        errorDetails: Prisma.DbNull,
      });

      if (executionResult.delivery && updatedRun.orderId) {
        await markOrderDeliveredFromTask(tx, {
          orderId: updatedRun.orderId,
          deliveryText: executionResult.delivery.deliveryText,
          deliveryUrl: executionResult.delivery.deliveryUrl,
        });
      }

      await touchAgentTaskLastRun(tx, runningTaskRun.agentTaskId, new Date());
      return updatedRun;
    });

    logger.info(
      {
        taskRunId: completedRun.id,
        attemptNumber: completedRun.attemptNumber,
        orderId: completedRun.orderId,
        promptKind: executionResult.promptKind,
        provider: executionResult.provider,
        model: executionResult.model,
      },
      "Task run completed successfully",
    );

    return completedRun;
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "Unknown task execution failure";
    const canRetry = runningTaskRun.attemptNumber < runningTaskRun.maxAttempts;
    const retryDelayMs = canRetry ? getRetryDelayMs(runningTaskRun.attemptNumber) : null;
    const errorDetails = {
      retryScheduled: canRetry,
      retryDelayMs,
      ...(error instanceof TaskExecutionError
        ? {
            code: error.code,
            details: asInputJsonValue(error.details),
          }
        : {}),
    } satisfies Prisma.InputJsonObject;

    const failedRun = await db.$transaction(async (tx) => {
      const updatedRun = await updateTaskRunRecord(tx, runningTaskRun.id, {
        status: TaskRunStatus.FAILED,
        completedAt: new Date(),
        errorMessage: failureReason,
        errorDetails,
      });

      await touchAgentTaskLastRun(tx, runningTaskRun.agentTaskId, new Date());

      if (!canRetry && updatedRun.orderId) {
        await markOrderFailedForTask(tx, {
          orderId: updatedRun.orderId,
          failureReason,
        });
      }

      return updatedRun;
    });

    logger.error(
      {
        err: error,
        taskRunId: failedRun.id,
        attemptNumber: failedRun.attemptNumber,
        orderId: failedRun.orderId,
        canRetry,
      },
      "Task run failed",
    );

    if (canRetry && failedRun.orderId) {
      await triggerTaskProcessingForOrder(db, queues, {
        orderId: failedRun.orderId,
        source: "retry",
        force: true,
        delayMs: retryDelayMs ?? undefined,
        attemptNumberOverride: failedRun.attemptNumber + 1,
      });
    }

    return failedRun;
  }
}
