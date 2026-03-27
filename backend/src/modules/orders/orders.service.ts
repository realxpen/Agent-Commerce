import {
  AgentServiceStatus,
  AgentStatus,
  DeliveryStatus,
  OrderPaymentStatus,
  OrderStatus,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import type { AppQueues } from "../../queues/index.js";
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

type OrderStore = PrismaClient | Prisma.TransactionClient;
type CreateOrderInput = CreateOrderBody & {
  customerId: string;
};

type OrderReferenceRecord = {
  type: "image" | "video" | "document" | "link";
  label: string;
  url: string;
  note: string | null;
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
  [OrderStatus.FAILED]: [],
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
  })) satisfies Prisma.InputJsonArray;
}

function toOrderReferenceList(
  value: Prisma.JsonValue | null | undefined,
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
      entry.type === "document" ||
      entry.type === "link"
        ? entry.type
        : null;
    const label = typeof entry.label === "string" ? entry.label : null;
    const url = typeof entry.url === "string" ? entry.url : null;
    const note = typeof entry.note === "string" ? entry.note : null;

    if (!type || !label || !url) {
      return [];
    }

    return [
      {
        type,
        label,
        url,
        note,
      } satisfies OrderReferenceRecord,
    ];
  });
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
    customerNote: order.customerNote,
    customerReferences: toOrderReferenceList(order.customerReferences),
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
): Promise<OrderDto> {
  const updatedOrder = await db.$transaction(async (tx) => {
    const existingOrder = await findOrderOrThrow(tx, orderId);

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
        deliveryUrl: normalizeOptionalString(input.deliveryUrl) ?? null,
        deliveryText: normalizeOptionalString(input.deliveryText) ?? null,
        deliveredAt: existingOrder.deliveredAt ?? new Date(),
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

    if (existingOrder.status === OrderStatus.COMPLETED) {
      return existingOrder;
    }

    if (existingOrder.status !== OrderStatus.DELIVERED) {
      throw createHttpError(409, "Order must be delivered before it can be completed");
    }

    const updated = await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: OrderStatus.COMPLETED,
        deliveryStatus: DeliveryStatus.DELIVERED,
        completedAt: existingOrder.completedAt ?? new Date(),
      },
      select: orderDtoSelect,
    });

    return updated;
  });

  return toOrderDto(updatedOrder);
}
