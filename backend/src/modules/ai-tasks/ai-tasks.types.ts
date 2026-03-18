import type { Prisma, TaskRunStatus } from "@prisma/client";

export const agentTaskSelect = {
  id: true,
  agentId: true,
  agentServiceId: true,
  name: true,
  slug: true,
  description: true,
  provider: true,
  model: true,
  config: true,
  maxRetries: true,
  timeoutSeconds: true,
  status: true,
  triggerType: true,
  type: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AgentTaskSelect;

export const taskRunSelect = {
  id: true,
  agentTaskId: true,
  orderId: true,
  queueJobId: true,
  idempotencyKey: true,
  status: true,
  attemptNumber: true,
  maxAttempts: true,
  input: true,
  output: true,
  errorMessage: true,
  errorDetails: true,
  startedAt: true,
  completedAt: true,
  nextRetryAt: true,
  createdAt: true,
  updatedAt: true,
  agentTask: {
    select: {
      id: true,
      agentId: true,
      agentServiceId: true,
      name: true,
      slug: true,
      type: true,
      provider: true,
      model: true,
      config: true,
      maxRetries: true,
      timeoutSeconds: true,
      status: true,
    },
  },
  order: {
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      deliveryStatus: true,
      serviceTitleSnapshot: true,
      customerNote: true,
      paymentReference: true,
      txHash: true,
      quotedPriceAmount: true,
      finalPaidAmount: true,
      currency: true,
      denom: true,
      serviceSnapshot: true,
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
    },
  },
} satisfies Prisma.TaskRunSelect;

export type AgentTaskRecord = Prisma.AgentTaskGetPayload<{
  select: typeof agentTaskSelect;
}>;

export type TaskRunRecord = Prisma.TaskRunGetPayload<{
  select: typeof taskRunSelect;
}>;

export type TaskRunDto = {
  id: string;
  agentTaskId: string;
  orderId: string | null;
  queueJobId: string | null;
  status: TaskRunStatus;
  attemptNumber: number;
  maxAttempts: number;
  input: unknown;
  output: unknown;
  errorMessage: string | null;
  errorDetails: unknown;
  startedAt: string | null;
  completedAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
  agentTask: {
    id: string;
    agentId: string;
    agentServiceId: string | null;
    name: string;
    slug: string;
    type: string;
    provider: string | null;
    model: string | null;
    status: string;
  };
  order: {
    id: string;
    status: string;
    paymentStatus: string;
    deliveryStatus: string;
    serviceTitle: string;
    customerNote: string | null;
    paymentReference: string | null;
    txHash: string | null;
    quotedPriceAmount: string;
    finalPaidAmount: string | null;
    currency: string | null;
    denom: string;
    customer: {
      id: string;
      displayName: string | null;
      email: string | null;
    };
    agent: {
      id: string;
      ownerId: string;
      name: string;
      slug: string;
      treasuryAddress: string;
    };
  } | null;
};

export type TriggerTaskProcessingResultDto = {
  data: TaskRunDto;
  meta: {
    queued: boolean;
    reusedExistingRun: boolean;
    source: string;
  };
};

export type TaskRunListDto = {
  data: TaskRunDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
