import {
  AgentServiceStatus,
  AgentStatus,
  DeliveryStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentConfirmationStatus,
  PaymentStatus,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import type { AppQueues } from "../../queues/index.js";
import { recomputeDailyTreasurySnapshot } from "../contract-events/contract-events.repository.js";
import { maybeTriggerTaskProcessingForOrder } from "../ai-tasks/task.service.js";
import type {
  AttachDeliverableBody,
  CreateOrderBody,
  ListOrdersForOwnerQuery,
  ListOrdersForUserQuery,
  UpdateOrderStatusBody,
} from "./orders.schemas.js";
import { createHttpError } from "../../utils/http-error.js";
import { orderDtoSelect, type OrderDto, type OrderListDto, type OrderRecord } from "./orders.types.js";
import {
  appendOrderDeliveryVersion,
  toOrderDeliveryVersionList,
} from "./delivery-versions.js";

type OrderStore = PrismaClient | Prisma.TransactionClient;
type CreateOrderInput = CreateOrderBody & {
  customerId: string;
};

type OrderReferenceRecord = {
  type: "image" | "video" | "audio" | "document" | "link";
  label: string;
  url: string;
  note: string | null;
  source: "link" | "upload";
  uploadId: string | null;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  previewText: string | null;
};

type OrderRevisionRequestRecord = {
  id: string;
  requestedByUserId: string;
  note: string;
  status: "OPEN" | "ADDRESSING" | "ADDRESSED" | "FAILED";
  requestedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  failureReason: string | null;
};

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.FAILED],
  [OrderStatus.PAID]: [
    OrderStatus.IN_PROGRESS,
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
  ],
  [OrderStatus.IN_PROGRESS]: [
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
  ],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.FAILED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [OrderStatus.IN_PROGRESS, OrderStatus.DELIVERED],
};

function normalizeOptionalString(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function normalizeOrderReferences(
  value: CreateOrderBody["customerReferences"],
): Prisma.InputJsonArray | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value.length === 0) {
    return null;
  }

  return value.map((reference) => ({
    type: reference.type,
    label: reference.label.trim(),
    url: reference.url.trim(),
    note: normalizeOptionalString(reference.note) ?? null,
    source: reference.source === "upload" ? "upload" : "link",
    uploadId: normalizeOptionalString(reference.uploadId) ?? null,
    fileName: normalizeOptionalString(reference.fileName) ?? null,
    contentType: normalizeOptionalString(reference.contentType) ?? null,
    sizeBytes:
      typeof reference.sizeBytes === "number" && Number.isFinite(reference.sizeBytes)
        ? Math.max(0, Math.trunc(reference.sizeBytes))
        : null,
    previewText: normalizeOptionalString(reference.previewText) ?? null,
  })) satisfies Prisma.InputJsonArray;
}

function mergeOrderReferences(
  existingValue: Prisma.JsonValue | null | undefined,
  additionsValue: CreateOrderBody["customerReferences"],
) {
  const existingReferences = toOrderReferenceList(existingValue);
  const additionalReferences = toOrderReferenceList(
    normalizeOrderReferences(additionsValue) ?? null,
  );

  if (additionalReferences.length === 0) {
    return existingReferences.length > 0
      ? (existingReferences satisfies Prisma.InputJsonArray)
      : Prisma.JsonNull;
  }

  const seen = new Set<string>();
  const mergedReferences: OrderReferenceRecord[] = [];

  for (const reference of [...existingReferences, ...additionalReferences]) {
    const identity = reference.uploadId
      ? `upload:${reference.uploadId}`
      : `${reference.source}:${reference.type}:${reference.url.toLowerCase()}:${reference.label.toLowerCase()}`;

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    mergedReferences.push(reference);
  }

  if (mergedReferences.length > 16) {
    throw createHttpError(
      409,
      "You can keep up to 16 total reference items on an order, including revision attachments",
    );
  }

  return mergedReferences satisfies Prisma.InputJsonArray;
}

function toOrderReferenceList(
  value: Prisma.JsonValue | Prisma.InputJsonArray | null | undefined,
): OrderReferenceRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const type =
      entry.type === "image" ||
      entry.type === "video" ||
      entry.type === "audio" ||
      entry.type === "document" ||
      entry.type === "link"
        ? entry.type
        : null;
    const label = typeof entry.label === "string" ? entry.label : null;
    const url = typeof entry.url === "string" ? entry.url : null;
    const note = typeof entry.note === "string" ? entry.note : null;
    const source = entry.source === "upload" ? "upload" : "link";
    const uploadId = typeof entry.uploadId === "string" ? entry.uploadId : null;
    const fileName = typeof entry.fileName === "string" ? entry.fileName : null;
    const contentType =
      typeof entry.contentType === "string" ? entry.contentType : null;
    const sizeBytes =
      typeof entry.sizeBytes === "number" && Number.isFinite(entry.sizeBytes)
        ? Math.max(0, Math.trunc(entry.sizeBytes))
        : null;
    const previewText =
      typeof entry.previewText === "string" ? entry.previewText : null;

    if (!type || !label || !url) {
      return [];
    }

    return [
      {
        type,
        label,
        url,
        note,
        source,
        uploadId,
        fileName,
        contentType,
        sizeBytes,
        previewText,
      } satisfies OrderReferenceRecord,
    ];
  });
}

function toOrderRevisionRequestList(
  value: Prisma.JsonValue | null | undefined,
): OrderRevisionRequestRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const id = typeof entry.id === "string" ? entry.id : null;
    const requestedByUserId =
      typeof entry.requestedByUserId === "string" ? entry.requestedByUserId : null;
    const note = typeof entry.note === "string" ? entry.note : null;
    const status =
      entry.status === "OPEN" ||
      entry.status === "ADDRESSING" ||
      entry.status === "ADDRESSED" ||
      entry.status === "FAILED"
        ? entry.status
        : null;
    const requestedAt =
      typeof entry.requestedAt === "string" ? entry.requestedAt : null;
    const updatedAt = typeof entry.updatedAt === "string" ? entry.updatedAt : requestedAt;
    const resolvedAt = typeof entry.resolvedAt === "string" ? entry.resolvedAt : null;
    const failureReason =
      typeof entry.failureReason === "string" ? entry.failureReason : null;

    if (!id || !requestedByUserId || !note || !status || !requestedAt || !updatedAt) {
      return [];
    }

    return [
      {
        id,
        requestedByUserId,
        note,
        status,
        requestedAt,
        updatedAt,
        resolvedAt,
        failureReason,
      } satisfies OrderRevisionRequestRecord,
    ];
  });
}

function hasActiveRevisionRequest(value: Prisma.JsonValue | null | undefined) {
  return toOrderRevisionRequestList(value).some(
    (revision) => revision.status === "OPEN" || revision.status === "ADDRESSING",
  );
}

function getLatestActiveRevisionRequest(value: Prisma.JsonValue | null | undefined) {
  return [...toOrderRevisionRequestList(value)]
    .reverse()
    .find((revision) => revision.status === "OPEN" || revision.status === "ADDRESSING")
    ?? null;
}

function markRevisionRequests(
  value: Prisma.JsonValue | null | undefined,
  nextStatus: OrderRevisionRequestRecord["status"],
  failureReason?: string | null,
) {
  const now = new Date().toISOString();
  const revisions = toOrderRevisionRequestList(value).map((revision) => {
    if (revision.status !== "OPEN" && revision.status !== "ADDRESSING") {
      return revision;
    }

    return {
      ...revision,
      status: nextStatus,
      updatedAt: now,
      resolvedAt: nextStatus === "ADDRESSED" || nextStatus === "FAILED" ? now : null,
      failureReason: nextStatus === "FAILED" ? failureReason ?? null : null,
    } satisfies OrderRevisionRequestRecord;
  });

  return revisions.length > 0 ? (revisions satisfies Prisma.InputJsonArray) : Prisma.JsonNull;
}

function toOrderDto(order: OrderRecord): OrderDto {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryStatus: order.deliveryStatus,
    customerId: order.customerId,
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
      category: order.agent.category,
      treasuryAddress: order.agent.treasuryAddress,
    },
    service: {
      id: order.service.id,
      slug: order.service.slug,
      title: order.serviceTitleSnapshot,
      snapshot: order.serviceSnapshot,
    },
    pricing: {
      quotedPrice: order.quotedPriceAmount.toString(),
      finalPaidAmount: order.finalPaidAmount?.toString() ?? null,
      currency: order.currency,
      denom: order.denom,
      quantity: order.quantity,
    },
    onchainOrderId: order.onchainOrderId?.toString() ?? null,
    customerNote: order.customerNote,
    customerReferences: toOrderReferenceList(order.customerReferences),
    revisionRequests: toOrderRevisionRequestList(order.revisionRequests),
    deliveryVersions: toOrderDeliveryVersionList(order.deliveryVersions),
    payment: {
      reference: order.paymentReference,
      txHash: order.txHash,
      expectedInfo: order.expectedPaymentInfo,
      paidAt: toIsoString(order.paidAt),
    },
    delivery: {
      url: order.deliveryUrl,
      text: order.deliveryText,
      deliveredAt: toIsoString(order.deliveredAt),
      completedAt: toIsoString(order.completedAt),
    },
    failedAt: toIsoString(order.failedAt),
    cancelledAt: toIsoString(order.cancelledAt),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

async function findOrderOrThrow(db: OrderStore, orderId: string): Promise<OrderRecord> {
  const order = await db.order.findUnique({
    where: {
      id: orderId,
    },
    select: orderDtoSelect,
  });

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  return order;
}

function ensureTransitionAllowed(from: OrderStatus, to: OrderStatus) {
  if (from === to) {
    return;
  }

  if (!allowedTransitions[from].includes(to)) {
    throw createHttpError(409, `Order cannot move from ${from} to ${to}`);
  }
}

function buildOrderStatusUpdate(
  existingOrder: OrderRecord,
  input: UpdateOrderStatusBody,
): Prisma.OrderUpdateInput {
  const now = new Date();
  const data: Prisma.OrderUpdateInput = {
    status: input.status,
  };

  if (input.paymentReference !== undefined) {
    data.paymentReference = normalizeOptionalString(input.paymentReference);
  }

  if (input.txHash !== undefined) {
    data.txHash = normalizeOptionalString(input.txHash);
  }

  if (input.onchainOrderId !== undefined) {
    data.onchainOrderId = input.onchainOrderId;
  }

  if (input.finalPaidAmount !== undefined) {
    data.finalPaidAmount = new Prisma.Decimal(input.finalPaidAmount);
  }

  switch (input.status) {
    case OrderStatus.PENDING:
      break;
    case OrderStatus.PAID:
      data.paymentStatus = OrderPaymentStatus.PAID;
      data.paidAt = existingOrder.paidAt ?? now;
      data.finalPaidAmount =
        input.finalPaidAmount !== undefined
          ? new Prisma.Decimal(input.finalPaidAmount)
          : existingOrder.finalPaidAmount ?? existingOrder.quotedPriceAmount;
      break;
    case OrderStatus.IN_PROGRESS:
      data.deliveryStatus = DeliveryStatus.IN_PROGRESS;
      if (existingOrder.paymentStatus !== OrderPaymentStatus.PAID) {
        data.paymentStatus = OrderPaymentStatus.PAID;
      }
      break;
    case OrderStatus.DELIVERED:
      data.deliveryStatus = DeliveryStatus.DELIVERED;
      data.deliveredAt = existingOrder.deliveredAt ?? now;
      if (existingOrder.paymentStatus !== OrderPaymentStatus.PAID) {
        data.paymentStatus = OrderPaymentStatus.PAID;
      }
      break;
    case OrderStatus.COMPLETED:
      data.deliveryStatus = DeliveryStatus.DELIVERED;
      data.completedAt = existingOrder.completedAt ?? now;
      if (existingOrder.paymentStatus !== OrderPaymentStatus.PAID) {
        data.paymentStatus = OrderPaymentStatus.PAID;
      }
      break;
    case OrderStatus.CANCELLED:
      data.deliveryStatus = DeliveryStatus.CANCELLED;
      if (
        existingOrder.paymentStatus === OrderPaymentStatus.UNPAID ||
        existingOrder.paymentStatus === OrderPaymentStatus.PENDING
      ) {
        data.paymentStatus = OrderPaymentStatus.CANCELLED;
      }
      data.cancelledAt = existingOrder.cancelledAt ?? now;
      break;
    case OrderStatus.FAILED:
      data.deliveryStatus = DeliveryStatus.FAILED;
      if (
        existingOrder.paymentStatus === OrderPaymentStatus.UNPAID ||
        existingOrder.paymentStatus === OrderPaymentStatus.PENDING
      ) {
        data.paymentStatus = OrderPaymentStatus.FAILED;
      }
      data.failedAt = existingOrder.failedAt ?? now;
      break;
    default:
      break;
  }

  return data;
}

function buildServiceSnapshot(service: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceAmount: Prisma.Decimal;
  priceCurrency: string | null;
  priceDenom: string;
  estimatedDeliveryMinutes: number | null;
  metadata: Prisma.JsonValue | null;
  agent: {
    id: string;
    name: string;
    slug: string;
    category: string;
    pricingModel: string;
    treasuryAddress: string;
  };
}) {
  return {
    id: service.id,
    slug: service.slug,
    title: service.title,
    description: service.description,
    priceAmount: service.priceAmount.toString(),
    priceCurrency: service.priceCurrency,
    priceDenom: service.priceDenom,
    estimatedDeliveryMinutes: service.estimatedDeliveryMinutes,
    metadata: service.metadata,
    agent: {
      id: service.agent.id,
      name: service.agent.name,
      slug: service.agent.slug,
      category: service.agent.category,
      pricingModel: service.agent.pricingModel,
      treasuryAddress: service.agent.treasuryAddress,
    },
  };
}

export async function createOrder(db: PrismaClient, input: CreateOrderInput): Promise<OrderDto> {
  const order = await db.$transaction(async (tx): Promise<OrderRecord> => {
    const [customer, service] = await Promise.all([
      tx.user.findUnique({
        where: {
          id: input.customerId,
        },
        select: {
          id: true,
        },
      }),
      tx.agentService.findUnique({
        where: {
          id: input.agentServiceId,
        },
        select: {
          id: true,
          agentId: true,
          slug: true,
          title: true,
          description: true,
          status: true,
          priceAmount: true,
          priceCurrency: true,
          priceDenom: true,
          estimatedDeliveryMinutes: true,
          metadata: true,
          agent: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              pricingModel: true,
              treasuryAddress: true,
              status: true,
            },
          },
        },
      }),
    ]);

    if (!customer) {
      throw createHttpError(404, "Customer not found");
    }

    if (!service) {
      throw createHttpError(404, "Agent service not found");
    }

    if (service.status !== AgentServiceStatus.ACTIVE) {
      throw createHttpError(409, "Only active services can be ordered");
    }

    if (service.agent.status !== AgentStatus.ACTIVE) {
      throw createHttpError(409, "Orders can only be created for active agents");
    }

    const quotedPriceAmount = service.priceAmount.mul(input.quantity);
    const paymentReference = normalizeOptionalString(input.paymentReference) ?? null;
    const txHash = normalizeOptionalString(input.txHash) ?? null;
    const customerNote = normalizeOptionalString(input.customerNote) ?? null;
    const customerReferences = normalizeOrderReferences(input.customerReferences) ?? null;

    if (paymentReference) {
      const existingOrder = await tx.order.findFirst({
        where: {
          customerId: input.customerId,
          agentServiceId: service.id,
          paymentReference,
        },
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        select: orderDtoSelect,
      });

      if (existingOrder) {
        return existingOrder;
      }
    }

    const expectedPaymentInfo: Prisma.InputJsonObject | undefined = input.expectedPayment
      ? {
          chainId: input.expectedPayment.chainId,
          amount: input.expectedPayment.amount ?? quotedPriceAmount.toString(),
          recipientAddress:
            input.expectedPayment.recipientAddress ?? service.agent.treasuryAddress,
          ...(input.expectedPayment.currency
            ? {
                currency: input.expectedPayment.currency,
              }
            : {}),
          ...(input.expectedPayment.denom
            ? {
                denom: input.expectedPayment.denom,
              }
            : {}),
          ...(input.expectedPayment.payerAddress
            ? {
                payerAddress: input.expectedPayment.payerAddress,
              }
            : {}),
          ...(input.expectedPayment.paymentReference ?? paymentReference
            ? {
                paymentReference:
                  input.expectedPayment.paymentReference ?? paymentReference ?? null,
              }
            : {}),
          ...(input.expectedPayment.txHash ?? txHash
            ? {
                txHash: input.expectedPayment.txHash ?? txHash ?? null,
              }
            : {}),
        }
      : undefined;

    return tx.order.create({
      data: {
        customerId: input.customerId,
        agentId: service.agentId,
        agentServiceId: service.id,
        status: OrderStatus.PENDING,
        paymentStatus:
          expectedPaymentInfo || paymentReference || txHash
            ? OrderPaymentStatus.PENDING
            : OrderPaymentStatus.UNPAID,
        deliveryStatus: DeliveryStatus.PENDING,
        serviceTitleSnapshot: service.title,
        serviceSnapshot: buildServiceSnapshot(service),
        quantity: input.quantity,
        quotedPriceAmount,
        finalPaidAmount: null,
        currency: service.priceCurrency,
        denom: service.priceDenom,
        customerNote,
        ...(customerReferences === undefined
          ? {}
          : {
              customerReferences:
                customerReferences === null ? Prisma.JsonNull : customerReferences,
            }),
        paymentReference,
        txHash,
        expectedPaymentInfo,
      },
      select: orderDtoSelect,
    });
  });

  return toOrderDto(order);
}

export async function requestOrderRevision(
  db: PrismaClient,
  queues: AppQueues,
  orderId: string,
  input: {
    customerId: string;
    note: string;
    customerReferences?: CreateOrderBody["customerReferences"];
  },
): Promise<OrderDto> {
  const order = await db.$transaction(async (tx) => {
    const existingOrder = await findOrderOrThrow(tx, orderId);

    if (existingOrder.customerId !== input.customerId) {
      throw createHttpError(403, "Only the customer can request a revision");
    }

    if (existingOrder.status !== OrderStatus.DELIVERED) {
      throw createHttpError(
        409,
        "Revisions can only be requested after a delivery is available",
      );
    }

    const existingRevisions = toOrderRevisionRequestList(existingOrder.revisionRequests);
    const hasActiveRevision = existingRevisions.some(
      (revision) => revision.status === "OPEN" || revision.status === "ADDRESSING",
    );

    if (hasActiveRevision) {
      throw createHttpError(
        409,
        "A revision request is already in progress for this order",
      );
    }

    const now = new Date().toISOString();
    const nextRevisions = [
      ...existingRevisions,
      {
        id: crypto.randomUUID().replace(/-/g, ""),
        requestedByUserId: input.customerId,
        note: input.note.trim(),
        status: "OPEN",
        requestedAt: now,
        updatedAt: now,
        resolvedAt: null,
        failureReason: null,
      } satisfies OrderRevisionRequestRecord,
    ] satisfies Prisma.InputJsonArray;

    const updatedOrder = await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        revisionRequests: nextRevisions,
        customerReferences: mergeOrderReferences(
          existingOrder.customerReferences,
          input.customerReferences,
        ),
      },
      select: orderDtoSelect,
    });

    return updatedOrder;
  });

  await maybeTriggerTaskProcessingForOrder(db, queues, {
    orderId,
    source: "revision-request",
    force: true,
  });

  return toOrderDto(order);
}

export async function getOrderById(db: OrderStore, orderId: string): Promise<OrderDto> {
  const order = await findOrderOrThrow(db, orderId);
  return toOrderDto(order);
}

export async function listOrdersForUser(
  db: OrderStore,
  customerId: string,
  query: ListOrdersForUserQuery,
): Promise<OrderListDto> {
  const where: Prisma.OrderWhereInput = {
    customerId,
    status: query.status,
  };
  const skip = (query.page - 1) * query.pageSize;

  const [orders, totalItems] = await Promise.all([
    db.order.findMany({
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
      select: orderDtoSelect,
    }),
    db.order.count({ where }),
  ]);

  return {
    data: orders.map(toOrderDto),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
    },
  };
}

export async function listOrdersForAgentOwner(
  db: OrderStore,
  ownerId: string,
  query: ListOrdersForOwnerQuery,
): Promise<OrderListDto> {
  const where: Prisma.OrderWhereInput = {
    status: query.status,
    agentId: query.agentId,
    agent: {
      ownerId,
    },
  };
  const skip = (query.page - 1) * query.pageSize;

  const [orders, totalItems] = await Promise.all([
    db.order.findMany({
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
      select: orderDtoSelect,
    }),
    db.order.count({ where }),
  ]);

  return {
    data: orders.map(toOrderDto),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
    },
  };
}

export async function updateOrderStatus(
  db: PrismaClient,
  queues: AppQueues,
  orderId: string,
  input: UpdateOrderStatusBody,
): Promise<OrderDto> {
  let shouldTriggerTaskProcessing = false;

  const updatedOrder = await db.$transaction(async (tx) => {
    const existingOrder = await findOrderOrThrow(tx, orderId);
    ensureTransitionAllowed(existingOrder.status, input.status);

    if (
      input.status !== OrderStatus.PAID &&
      input.status !== OrderStatus.IN_PROGRESS &&
      input.status !== OrderStatus.DELIVERED &&
      input.status !== OrderStatus.COMPLETED &&
      input.finalPaidAmount !== undefined
    ) {
      throw createHttpError(
        409,
        "finalPaidAmount can only be set when the order is paid or fulfilled",
      );
    }

    const updated = await tx.order.update({
      where: {
        id: orderId,
      },
      data: buildOrderStatusUpdate(existingOrder, input),
      select: orderDtoSelect,
    });

    shouldTriggerTaskProcessing =
      existingOrder.status !== OrderStatus.PAID && updated.status === OrderStatus.PAID;

    return updated;
  });

  if (shouldTriggerTaskProcessing) {
    await maybeTriggerTaskProcessingForOrder(db, queues, {
      orderId: updatedOrder.id,
      source: "order-status-update",
    });
  }

  return toOrderDto(updatedOrder);
}

export async function attachDeliverable(
  db: PrismaClient,
  orderId: string,
  input: AttachDeliverableBody,
  actorUserId?: string | null,
): Promise<OrderDto> {
  const updatedOrder = await db.$transaction(async (tx) => {
    const existingOrder = await findOrderOrThrow(tx, orderId);
    const activeRevision = getLatestActiveRevisionRequest(existingOrder.revisionRequests);
    const normalizedDeliveryUrl = normalizeOptionalString(input.deliveryUrl) ?? null;
    const normalizedDeliveryText = normalizeOptionalString(input.deliveryText) ?? null;

    if (
      existingOrder.status === OrderStatus.CANCELLED ||
      existingOrder.status === OrderStatus.FAILED ||
      existingOrder.status === OrderStatus.COMPLETED
    ) {
      throw createHttpError(409, "Deliverables cannot be attached to a terminal order");
    }

    if (
      existingOrder.status === OrderStatus.PENDING ||
      existingOrder.paymentStatus !== OrderPaymentStatus.PAID
    ) {
      throw createHttpError(409, "Only paid orders can receive deliverables");
    }

    const updated = await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: OrderStatus.DELIVERED,
        deliveryStatus: DeliveryStatus.DELIVERED,
        deliveryUrl: normalizedDeliveryUrl,
        deliveryText: normalizedDeliveryText,
        deliveredAt: existingOrder.deliveredAt ?? new Date(),
        deliveryVersions: appendOrderDeliveryVersion(existingOrder.deliveryVersions, {
          source: "owner_publish",
          revisionRequestId: activeRevision?.id ?? null,
          publishedByUserId: actorUserId ?? null,
          deliveryUrl: normalizedDeliveryUrl,
          deliveryText: normalizedDeliveryText,
        }),
        ...(activeRevision
          ? {
              revisionRequests: markRevisionRequests(
                existingOrder.revisionRequests,
                "ADDRESSED",
              ),
            }
          : {}),
      },
      select: orderDtoSelect,
    });

    return updated;
  });

  return toOrderDto(updatedOrder);
}

export async function markOrderCompleted(
  db: PrismaClient,
  orderId: string,
): Promise<OrderDto> {
  const updatedOrder = await db.$transaction(async (tx) => {
    const existingOrder = await findOrderOrThrow(tx, orderId);
    const completedAt = existingOrder.completedAt
      ? new Date(existingOrder.completedAt)
      : new Date();

    if (
      existingOrder.status !== OrderStatus.DELIVERED &&
      existingOrder.status !== OrderStatus.COMPLETED
    ) {
      throw createHttpError(409, "Order must be delivered before it can be completed");
    }

    const updated =
      existingOrder.status === OrderStatus.COMPLETED
        ? existingOrder
        : await tx.order.update({
            where: {
              id: orderId,
            },
            data: {
              status: OrderStatus.COMPLETED,
              deliveryStatus: DeliveryStatus.DELIVERED,
              completedAt,
            },
            select: orderDtoSelect,
          });

    await tx.payment.updateMany({
      where: {
        orderId,
        status: PaymentStatus.CONFIRMED,
        confirmationStatus: {
          not: PaymentConfirmationStatus.FINALIZED,
        },
      },
      data: {
        confirmationStatus: PaymentConfirmationStatus.FINALIZED,
        finalizedAt: completedAt,
      },
    });

    await recomputeDailyTreasurySnapshot(tx, {
      agentId: existingOrder.agent.id,
      denom: existingOrder.denom,
      currency: existingOrder.currency,
      referenceTime: completedAt,
    });

    return updated;
  });

  return toOrderDto(updatedOrder);
}
