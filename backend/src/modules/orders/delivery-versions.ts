import { Prisma } from "@prisma/client";

export type OrderDeliveryVersionSource =
  | "ai_task"
  | "owner_publish";

export type OrderDeliveryVersionRecord = {
  id: string;
  versionNumber: number;
  source: OrderDeliveryVersionSource;
  revisionRequestId: string | null;
  taskRunId: string | null;
  publishedByUserId: string | null;
  deliveryUrl: string | null;
  deliveryText: string | null;
  createdAt: string;
};

export function toOrderDeliveryVersionList(
  value: Prisma.JsonValue | null | undefined,
): OrderDeliveryVersionRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const id = typeof entry.id === "string" ? entry.id : null;
    const versionNumber =
      typeof entry.versionNumber === "number" && Number.isInteger(entry.versionNumber)
        ? entry.versionNumber
        : null;
    const source =
      entry.source === "ai_task" || entry.source === "owner_publish"
        ? entry.source
        : null;
    const revisionRequestId =
      typeof entry.revisionRequestId === "string" ? entry.revisionRequestId : null;
    const taskRunId = typeof entry.taskRunId === "string" ? entry.taskRunId : null;
    const publishedByUserId =
      typeof entry.publishedByUserId === "string" ? entry.publishedByUserId : null;
    const deliveryUrl = typeof entry.deliveryUrl === "string" ? entry.deliveryUrl : null;
    const deliveryText = typeof entry.deliveryText === "string" ? entry.deliveryText : null;
    const createdAt = typeof entry.createdAt === "string" ? entry.createdAt : null;

    if (!id || !versionNumber || !source || !createdAt) {
      return [];
    }

    return [
      {
        id,
        versionNumber,
        source,
        revisionRequestId,
        taskRunId,
        publishedByUserId,
        deliveryUrl,
        deliveryText,
        createdAt,
      } satisfies OrderDeliveryVersionRecord,
    ];
  });
}

export function appendOrderDeliveryVersion(
  value: Prisma.JsonValue | null | undefined,
  input: {
    source: OrderDeliveryVersionSource;
    revisionRequestId?: string | null;
    taskRunId?: string | null;
    publishedByUserId?: string | null;
    deliveryUrl?: string | null;
    deliveryText?: string | null;
  },
) {
  const existing = toOrderDeliveryVersionList(value);
  const nextVersionNumber =
    existing.reduce(
      (maxVersion, version) => Math.max(maxVersion, version.versionNumber),
      0,
    ) + 1;

  const nextVersions = [
    ...existing,
    {
      id: crypto.randomUUID().replace(/-/g, ""),
      versionNumber: nextVersionNumber,
      source: input.source,
      revisionRequestId: input.revisionRequestId ?? null,
      taskRunId: input.taskRunId ?? null,
      publishedByUserId: input.publishedByUserId ?? null,
      deliveryUrl: input.deliveryUrl ?? null,
      deliveryText: input.deliveryText ?? null,
      createdAt: new Date().toISOString(),
    } satisfies OrderDeliveryVersionRecord,
  ];

  return nextVersions satisfies Prisma.InputJsonArray;
}
