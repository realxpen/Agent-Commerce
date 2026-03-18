export const JOB_NAMES = {
  orders: {
    process: "orders.process",
    syncPayment: "orders.sync-payment",
  },
  payments: {
    track: "payments.track",
    reconcile: "payments.reconcile",
  },
  aiTasks: {
    execute: "ai.execute",
  },
  webhooks: {
    process: "webhooks.process",
  },
  indexing: {
    ingest: "indexing.ingest",
  },
} as const;

export type QueueJobMap = {
  "orders.process": { orderId: string };
  "orders.sync-payment": { orderId: string; paymentId?: string };
  "payments.track": { paymentId: string };
  "payments.reconcile": { chainTxHash: string };
  "ai.execute": {
    taskRunId: string;
    agentTaskId: string;
    orderId: string;
    attemptNumber: number;
  };
  "webhooks.process": { webhookEventId: string };
  "indexing.ingest": { chainEventId: string };
};
