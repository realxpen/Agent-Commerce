import {
  AgentTaskStatus,
  AgentTaskType,
  DeliveryStatus,
  OrderStatus,
  Prisma,
  TaskRunStatus,
  TaskTriggerType,
  type PrismaClient,
} from "@prisma/client";

import { serviceFulfillmentOutputJsonSchema } from "../../services/llm/prompts/service-fulfillment.prompt.js";
import { createHttpError } from "../../utils/http-error.js";
import { agentTaskSelect, taskRunSelect, type AgentTaskRecord, type TaskRunRecord } from "./ai-tasks.types.js";

export type AiTaskStore = PrismaClient | Prisma.TransactionClient;

export async function findOrderForTaskOrThrow(db: AiTaskStore, orderId: string) {
  const order = await db.order.findUnique({
    where: {
      id: orderId,
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
  });

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  return order;
}

export async function upsertFulfillmentTask(
  db: AiTaskStore,
  input: {
    order: Awaited<ReturnType<typeof findOrderForTaskOrThrow>>;
    provider?: string;
    model?: string | null;
    config?: Prisma.InputJsonValue;
  },
): Promise<AgentTaskRecord> {
  const slug = `order-${input.order.id}-fulfillment`;

  return db.agentTask.upsert({
    where: {
      agentId_slug: {
        agentId: input.order.agentId,
        slug,
      },
    },
    create: {
      agentId: input.order.agentId,
      agentServiceId: input.order.agentServiceId,
      name: `Fulfill ${input.order.serviceTitleSnapshot}`,
      slug,
      description: `Auto-generated fulfillment task for order ${input.order.id}`,
      type: AgentTaskType.ORDER_FULFILLMENT,
      triggerType: TaskTriggerType.PAYMENT_CONFIRMED,
      status: AgentTaskStatus.ACTIVE,
      provider: input.provider ?? "openai",
      model: input.model ?? null,
      config:
        input.config ??
        ({
          promptKind: "service_fulfillment",
          responseSchemaVersion: "v1",
        } satisfies Prisma.InputJsonObject),
      inputSchema: {
        type: "object",
        required: ["orderId", "agentId", "customerId", "serviceTitle"],
      },
      outputSchema: serviceFulfillmentOutputJsonSchema as Prisma.InputJsonValue,
      maxRetries: 3,
      timeoutSeconds: 60,
    },
    update: {
      status: AgentTaskStatus.ACTIVE,
      ...(input.provider
        ? {
            provider: input.provider,
          }
        : {}),
      ...(input.model !== undefined
        ? {
            model: input.model,
          }
        : {}),
      ...(input.config
        ? {
            config: input.config,
          }
        : {}),
    },
    select: agentTaskSelect,
  });
}

export async function findLatestTaskRunForTask(
  db: AiTaskStore,
  agentTaskId: string,
): Promise<TaskRunRecord | null> {
  return db.taskRun.findFirst({
    where: {
      agentTaskId,
    },
    orderBy: [
      {
        attemptNumber: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: taskRunSelect,
  });
}

export async function findActiveTaskRunForTask(
  db: AiTaskStore,
  agentTaskId: string,
): Promise<TaskRunRecord | null> {
  return db.taskRun.findFirst({
    where: {
      agentTaskId,
      status: {
        in: [TaskRunStatus.QUEUED, TaskRunStatus.RUNNING],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: taskRunSelect,
  });
}

export async function findTaskRunOrThrow(
  db: AiTaskStore,
  taskRunId: string,
): Promise<TaskRunRecord> {
  const taskRun = await db.taskRun.findUnique({
    where: {
      id: taskRunId,
    },
    select: taskRunSelect,
  });

  if (!taskRun) {
    throw createHttpError(404, "Task run not found");
  }

  return taskRun;
}

export async function createTaskRunRecord(
  db: AiTaskStore,
  data: Prisma.TaskRunCreateInput | Prisma.TaskRunUncheckedCreateInput,
): Promise<TaskRunRecord> {
  return db.taskRun.create({
    data,
    select: taskRunSelect,
  });
}

export async function updateTaskRunRecord(
  db: AiTaskStore,
  taskRunId: string,
  data: Prisma.TaskRunUpdateInput,
): Promise<TaskRunRecord> {
  return db.taskRun.update({
    where: {
      id: taskRunId,
    },
    data,
    select: taskRunSelect,
  });
}

export async function touchAgentTaskLastRun(
  db: AiTaskStore,
  agentTaskId: string,
  at: Date,
) {
  return db.agentTask.update({
    where: {
      id: agentTaskId,
    },
    data: {
      lastRunAt: at,
    },
    select: agentTaskSelect,
  });
}

export async function markOrderInProgressForTask(db: AiTaskStore, orderId: string) {
  return db.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: OrderStatus.IN_PROGRESS,
      deliveryStatus: DeliveryStatus.IN_PROGRESS,
    },
    select: {
      id: true,
      status: true,
      deliveryStatus: true,
    },
  });
}

export async function markOrderDeliveredFromTask(
  db: AiTaskStore,
  input: {
    orderId: string;
    deliveryText: string;
    deliveryUrl?: string | null;
  },
) {
  return db.order.update({
    where: {
      id: input.orderId,
    },
    data: {
      status: OrderStatus.DELIVERED,
      deliveryStatus: DeliveryStatus.DELIVERED,
      deliveryText: input.deliveryText,
      deliveryUrl: input.deliveryUrl ?? null,
      deliveredAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      deliveryStatus: true,
      deliveredAt: true,
    },
  });
}

export async function markOrderFailedForTask(
  db: AiTaskStore,
  input: {
    orderId: string;
    failureReason: string;
  },
) {
  return db.order.update({
    where: {
      id: input.orderId,
    },
    data: {
      status: OrderStatus.FAILED,
      deliveryStatus: DeliveryStatus.FAILED,
      failedAt: new Date(),
      deliveryText: input.failureReason,
    },
    select: {
      id: true,
      status: true,
      deliveryStatus: true,
      failedAt: true,
    },
  });
}
