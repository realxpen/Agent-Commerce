import {
  DeliveryStatus,
  OrderPaymentStatus,
  OrderStatus,
  Prisma,
  TaskRunStatus,
  type PrismaClient,
} from "@prisma/client";

import type { AppQueues } from "../../queues/index.js";
import { JOB_NAMES } from "../../jobs/index.js";
import { logger } from "../../lib/logger.js";
import { createHttpError } from "../../utils/http-error.js";
import { getServiceExecutionContextFromServiceSnapshot } from "../services/service-execution.js";
import {
  createTaskRunRecord,
  findActiveTaskRunForTask,
  findLatestTaskRunForTask,
  findOrderForTaskOrThrow,
  findTaskRunOrThrow,
  upsertFulfillmentTask,
  updateTaskRunRecord,
} from "./ai-tasks.repository.js";
import type {
  TaskRunDto,
  TaskRunListDto,
  TaskRunRecord,
  TriggerTaskProcessingResultDto,
} from "./ai-tasks.types.js";
import { taskRunSelect } from "./ai-tasks.types.js";
import type { ListTaskRunsQuery, TriggerTaskProcessingBody } from "./ai-tasks.schemas.js";

type TriggerSource =
  | "order-status-update"
  | "payment-create"
  | "contract-event"
  | "revision-request"
  | "manual-test"
  | "owner-resume"
  | "retry";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toTaskRunDto(taskRun: TaskRunRecord): TaskRunDto {
  return {
    id: taskRun.id,
    agentTaskId: taskRun.agentTaskId,
    orderId: taskRun.orderId,
    queueJobId: taskRun.queueJobId,
    status: taskRun.status,
    attemptNumber: taskRun.attemptNumber,
    maxAttempts: taskRun.maxAttempts,
    input: taskRun.input,
    output: taskRun.output,
    errorMessage: taskRun.errorMessage,
    errorDetails: taskRun.errorDetails,
    startedAt: toIsoString(taskRun.startedAt),
    completedAt: toIsoString(taskRun.completedAt),
    nextRetryAt: toIsoString(taskRun.nextRetryAt),
    createdAt: taskRun.createdAt.toISOString(),
    updatedAt: taskRun.updatedAt.toISOString(),
    agentTask: {
      id: taskRun.agentTask.id,
      agentId: taskRun.agentTask.agentId,
      agentServiceId: taskRun.agentTask.agentServiceId,
      name: taskRun.agentTask.name,
      slug: taskRun.agentTask.slug,
      type: taskRun.agentTask.type,
      provider: taskRun.agentTask.provider,
      model: taskRun.agentTask.model,
      status: taskRun.agentTask.status,
    },
    order: taskRun.order
      ? {
          id: taskRun.order.id,
          status: taskRun.order.status,
          paymentStatus: taskRun.order.paymentStatus,
          deliveryStatus: taskRun.order.deliveryStatus,
          serviceTitle: taskRun.order.serviceTitleSnapshot,
          customerNote: taskRun.order.customerNote,
          revisionRequests: taskRun.order.revisionRequests,
          paymentReference: taskRun.order.paymentReference,
          txHash: taskRun.order.txHash,
          quotedPriceAmount: taskRun.order.quotedPriceAmount.toString(),
          finalPaidAmount: taskRun.order.finalPaidAmount?.toString() ?? null,
          currency: taskRun.order.currency,
          denom: taskRun.order.denom,
          customer: {
            id: taskRun.order.customer.id,
            displayName: taskRun.order.customer.displayName,
            email: taskRun.order.customer.email,
          },
          agent: {
            id: taskRun.order.agent.id,
            ownerId: taskRun.order.agent.ownerId,
            name: taskRun.order.agent.name,
            slug: taskRun.order.agent.slug,
            treasuryAddress: taskRun.order.agent.treasuryAddress,
          },
        }
      : null,
  };
}

function buildTaskConfig(body?: TriggerTaskProcessingBody): Prisma.InputJsonObject | undefined {
  if (!body || (body.promptKind === undefined && body.additionalInstructions === undefined)) {
    return undefined;
  }

  return {
    responseSchemaVersion: "v1",
    ...(body.promptKind !== undefined
      ? {
          promptKind: body.promptKind,
        }
      : {}),
    ...(body.additionalInstructions !== undefined
      ? {
          additionalInstructions: body.additionalInstructions,
        }
      : {}),
  } satisfies Prisma.InputJsonObject;
}

function buildPromptInput(order: Awaited<ReturnType<typeof findOrderForTaskOrThrow>>, attemptNumber: number) {
  const executionContext = getServiceExecutionContextFromServiceSnapshot(
    order.serviceSnapshot,
  );

  return {
    orderId: order.id,
    agentId: order.agentId,
    customerId: order.customerId,
    serviceTitle: order.serviceTitleSnapshot,
    serviceSnapshot: order.serviceSnapshot,
    quotedPriceAmount: order.quotedPriceAmount.toString(),
    finalPaidAmount: order.finalPaidAmount?.toString() ?? null,
    currency: order.currency,
    denom: order.denom,
    paymentReference: order.paymentReference,
    txHash: order.txHash,
    customerNote: order.customerNote,
    customerReferences: Array.isArray(order.customerReferences)
      ? order.customerReferences
      : [],
    revisionRequests: Array.isArray(order.revisionRequests)
      ? order.revisionRequests
      : [],
    customer: {
      id: order.customer.id,
      displayName: order.customer.displayName,
      email: order.customer.email,
    },
    agent: {
      id: order.agent.id,
      ownerId: order.agent.ownerId,
      name: order.agent.name,
      slug: order.agent.slug,
      treasuryAddress: order.agent.treasuryAddress,
    },
    service: {
      id: order.service.id,
      slug: order.service.slug,
      title: order.service.title,
    },
    execution: {
      attemptNumber,
      createdAt: new Date().toISOString(),
      mode: executionContext.mode,
      deliverableType: executionContext.deliverableType,
      ownerReviewRequired: executionContext.ownerReviewRequired,
      autoDelivery: executionContext.autoDelivery,
    },
  } satisfies Prisma.InputJsonObject;
}

async function enqueueTaskRun(
  queues: AppQueues,
  input: {
    taskRunId: string;
    agentTaskId: string;
    orderId: string;
    attemptNumber: number;
    delayMs?: number;
  },
) {
  await queues.aiTasks.add(
    JOB_NAMES.aiTasks.execute,
    {
      taskRunId: input.taskRunId,
      agentTaskId: input.agentTaskId,
      orderId: input.orderId,
      attemptNumber: input.attemptNumber,
    },
    {
      jobId: input.taskRunId,
      attempts: 1,
      delay: input.delayMs ?? 0,
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  );
}

export async function triggerTaskProcessingForOrder(
  db: PrismaClient,
  queues: AppQueues,
  input: {
    orderId: string;
    source: TriggerSource;
    force?: boolean;
    taskConfig?: TriggerTaskProcessingBody;
    delayMs?: number;
    attemptNumberOverride?: number;
  },
): Promise<TriggerTaskProcessingResultDto> {
  const setup = await db.$transaction(async (tx) => {
    const existingOrder = await findOrderForTaskOrThrow(tx, input.orderId);
    const order =
      input.force &&
      existingOrder.status === OrderStatus.FAILED &&
      existingOrder.paymentStatus === OrderPaymentStatus.PAID
        ? await tx.order.update({
            where: {
              id: existingOrder.id,
            },
            data: {
              status: OrderStatus.PAID,
              deliveryStatus: DeliveryStatus.PENDING,
              failedAt: null,
              deliveryText: null,
            },
            select: {
              id: true,
              agentId: true,
              agentServiceId: true,
              status: true,
              paymentStatus: true,
              deliveryStatus: true,
              serviceTitleSnapshot: true,
              serviceSnapshot: true,
              customerId: true,
              customerNote: true,
              customerReferences: true,
              revisionRequests: true,
              deliveryVersions: true,
              paymentReference: true,
              txHash: true,
              quotedPriceAmount: true,
              finalPaidAmount: true,
              currency: true,
              denom: true,
              createdAt: true,
              customer: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                },
              },
              agent: {
                select: {
                  id: true,
                  ownerId: true,
                  name: true,
                  slug: true,
                  treasuryAddress: true,
                },
              },
              service: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                },
              },
            },
          })
        : existingOrder;

    if (order.paymentStatus !== OrderPaymentStatus.PAID) {
      throw createHttpError(409, "Tasks can only be triggered for paid orders");
    }

    const agentTask = await upsertFulfillmentTask(tx, {
      order,
      provider: input.taskConfig?.provider,
      model: input.taskConfig?.model,
      config: buildTaskConfig(input.taskConfig),
    });

    const activeRun = await findActiveTaskRunForTask(tx, agentTask.id);
    if (activeRun && !input.force) {
      return {
        taskRun: activeRun,
        queued: false,
        reusedExistingRun: true,
      };
    }

    const latestRun = await findLatestTaskRunForTask(tx, agentTask.id);
    if (latestRun?.status === TaskRunStatus.SUCCEEDED && !input.force) {
      return {
        taskRun: latestRun,
        queued: false,
        reusedExistingRun: true,
      };
    }

    if (
      latestRun?.status === TaskRunStatus.FAILED &&
      latestRun.attemptNumber >= agentTask.maxRetries &&
      !input.force
    ) {
      return {
        taskRun: latestRun,
        queued: false,
        reusedExistingRun: true,
      };
    }

    const attemptNumber =
      input.attemptNumberOverride ??
      (latestRun ? latestRun.attemptNumber + 1 : 1);

    const taskRunId = crypto.randomUUID().replace(/-/g, "").slice(0, 25);

    const taskRun = await createTaskRunRecord(tx, {
      id: taskRunId,
      agentTaskId: agentTask.id,
      orderId: order.id,
      queueJobId: taskRunId,
      idempotencyKey: `${agentTask.id}:attempt:${attemptNumber}`,
      status: TaskRunStatus.QUEUED,
      attemptNumber,
      maxAttempts: agentTask.maxRetries,
      input: buildPromptInput(order, attemptNumber),
      nextRetryAt: input.delayMs ? new Date(Date.now() + input.delayMs) : null,
    });

    return {
      taskRun,
      queued: true,
      reusedExistingRun: false,
    };
  });

  if (setup.queued && setup.taskRun.orderId) {
    try {
      await enqueueTaskRun(queues, {
        taskRunId: setup.taskRun.id,
        agentTaskId: setup.taskRun.agentTaskId,
        orderId: setup.taskRun.orderId,
        attemptNumber: setup.taskRun.attemptNumber,
        delayMs: input.delayMs,
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          taskRunId: setup.taskRun.id,
          orderId: setup.taskRun.orderId,
          source: input.source,
        },
        "Failed to enqueue task run",
      );

      await updateTaskRunRecord(db, setup.taskRun.id, {
        status: TaskRunStatus.FAILED,
        completedAt: new Date(),
        errorMessage: "Failed to enqueue task run",
        errorDetails: {
          source: input.source,
        },
      });

      throw createHttpError(500, "Failed to enqueue task processing");
    }
  }

  const freshTaskRun = await findTaskRunOrThrow(db, setup.taskRun.id);

  return {
    data: toTaskRunDto(freshTaskRun),
    meta: {
      queued: setup.queued,
      reusedExistingRun: setup.reusedExistingRun,
      source: input.source,
    },
  };
}

export async function maybeTriggerTaskProcessingForOrder(
  db: PrismaClient,
  queues: AppQueues,
  input: {
    orderId: string;
    source: TriggerSource;
    force?: boolean;
    taskConfig?: TriggerTaskProcessingBody;
  },
) {
  try {
    return await triggerTaskProcessingForOrder(db, queues, input);
  } catch (error) {
    logger.error(
      {
        err: error,
        orderId: input.orderId,
        source: input.source,
      },
      "Failed to trigger AI task processing for paid order",
    );

    return null;
  }
}

export async function getTaskRunById(db: PrismaClient, taskRunId: string): Promise<TaskRunDto> {
  const taskRun = await findTaskRunOrThrow(db, taskRunId);
  return toTaskRunDto(taskRun);
}

export async function listTaskRuns(
  db: PrismaClient,
  ownerId: string,
  query: ListTaskRunsQuery,
): Promise<TaskRunListDto> {
  const skip = (query.page - 1) * query.pageSize;
  const where: Prisma.TaskRunWhereInput = {
    agentTask: {
      agent: {
        ownerId,
      },
    },
    ...(query.agentId
      ? {
          agentTask: {
            agent: {
              ownerId,
            },
            agentId: query.agentId,
          },
        }
      : {}),
    ...(query.orderId
      ? {
          orderId: query.orderId,
        }
      : {}),
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
  };

  const [taskRuns, totalItems] = await Promise.all([
    db.taskRun.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: taskRunSelect,
    }),
    db.taskRun.count({ where }),
  ]);

  return {
    data: taskRuns.map(toTaskRunDto),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
    },
  };
}
