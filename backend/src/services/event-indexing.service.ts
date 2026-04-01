import {
  AgentPricingModel,
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
import { formatUnits } from "viem";

import { logger } from "../lib/logger.js";
import { createHttpError } from "../utils/http-error.js";
import { slugify } from "../utils/slug.js";
import type { NormalizedContractEvent } from "../modules/contract-events/contract-events.parser.js";
import {
  incrementContractEventProcessingAttempt,
  markContractEventFailed,
  markContractEventProcessed,
  recomputeDailyTreasurySnapshot,
  upsertContractEventSeed,
} from "../modules/contract-events/contract-events.repository.js";
import type { ContractEventRecord } from "../modules/contract-events/contract-events.types.js";
import { mapContractEventToPaymentMutation } from "../modules/contract-events/contract-events.mapper.js";
import {
  buildPaymentUpdateData,
  buildPaymentWriteData,
  createPaymentRecord,
  findOrderByOnchainOrderId,
  findOrderByPaymentReference,
  findOrderByTxHash,
  findOrderForPaymentCreate,
  findPaymentForEventMatch,
  syncOrderFromPaymentStatus,
  updatePaymentRecord,
} from "../modules/payments/payments.repository.js";
import type { PaymentRecord } from "../modules/payments/payments.types.js";
import { env } from "../config/env.js";

type IndexedEventMutationResult = {
  payment: PaymentRecord | null;
  orderId: string | null;
  agentId: string | null;
  shouldTriggerTaskProcessing: boolean;
};

type MatchedOrder = NonNullable<Awaited<ReturnType<typeof findOrderForPaymentCreate>>>;

type OrderLifecycleRecord = {
  id: string;
  agentId: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  deliveryStatus: DeliveryStatus;
  onchainOrderId: bigint | null;
  paymentReference: string | null;
  txHash: string | null;
  quotedPriceAmount: Prisma.Decimal;
  finalPaidAmount: Prisma.Decimal | null;
  currency: string | null;
  denom: string;
  deliveryUrl: string | null;
  deliveryText: string | null;
  paidAt: Date | null;
  deliveredAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  failedAt: Date | null;
  agent: {
    treasuryAddress: string;
  };
};

type ChainOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "DISPUTED";

type RegistryAgentRecord = {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  description: string;
  pricingModel: AgentPricingModel;
  status: AgentStatus;
  appchainId: string | null;
  treasuryAddress: string;
  initUsername: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

type RegistryServiceRecord = {
  id: string;
  agentId: string;
  title: string;
  description: string | null;
  status: AgentServiceStatus;
  priceAmount: Prisma.Decimal;
  priceCurrency: string | null;
  priceDenom: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

function parseBigIntString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function parseEventAmountToDecimal(
  value: string | null | undefined,
  fallback: Prisma.Decimal | null,
) {
  if (!value) {
    return fallback;
  }

  try {
    if (/^\d+$/.test(value)) {
      return new Prisma.Decimal(formatUnits(BigInt(value), env.INDEXER_NATIVE_TOKEN_DECIMALS));
    }

    return new Prisma.Decimal(value);
  } catch {
    return fallback;
  }
}

function normalizeChainOrderStatus(value: string | null | undefined): ChainOrderStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  switch (normalized) {
    case "PENDING_PAYMENT":
    case "PAID":
    case "IN_PROGRESS":
    case "DELIVERED":
    case "COMPLETED":
    case "CANCELLED":
    case "REFUNDED":
    case "DISPUTED":
      return normalized;
    default:
      return null;
  }
}

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

function getJsonRecord(value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getStringValue(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getBooleanValue(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

function getNestedRecord(
  record: Record<string, unknown> | null,
  key: string,
) {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mergeJsonObject(
  existing: Prisma.JsonValue | null | undefined,
  patch: Record<string, unknown>,
): Prisma.InputJsonObject {
  const base = getJsonRecord(existing) ?? {};
  return {
    ...base,
    ...patch,
  } as Prisma.InputJsonObject;
}

function buildAgentOnchainMetadata(input: {
  existing: Prisma.JsonValue | null | undefined;
  chainId: string;
  contractAddress: string;
  onchainAgentId: string;
  sourceTxHash: string;
}) {
  const base = getJsonRecord(input.existing) ?? {};
  const onchainBase = getNestedRecord(base, "onchain") ?? {};
  const syncBase = getNestedRecord(base, "sync") ?? {};

  return {
    ...base,
    onchain: {
      ...onchainBase,
      agentId: input.onchainAgentId,
      chainId: input.chainId,
      contractAddress: input.contractAddress,
    },
    sync: {
      ...syncBase,
      indexedFromChain: true,
      indexedAt: new Date().toISOString(),
      sourceTxHash: input.sourceTxHash,
    },
  } satisfies Prisma.InputJsonObject;
}

function buildServiceMetadata(input: {
  existing: Prisma.JsonValue | null | undefined;
  chainId: string;
  contractAddress: string;
  onchainAgentId: string;
  onchainServiceId: string;
  payableAmount: string;
  displayAmount: string;
  sourceTxHash: string;
}) {
  const base = getJsonRecord(input.existing) ?? {};
  const onchainBase = getNestedRecord(base, "onchain") ?? {};
  const paymentBase = getNestedRecord(base, "payment") ?? {};
  const syncBase = getNestedRecord(base, "sync") ?? {};

  return {
    ...base,
    onchain: {
      ...onchainBase,
      agentId: input.onchainAgentId,
      serviceId: input.onchainServiceId,
      chainId: input.chainId,
      contractAddress: input.contractAddress,
    },
    payment: {
      ...paymentBase,
      payableAmount: input.payableAmount,
      displayAmount: input.displayAmount,
      denom: env.INDEXER_NATIVE_TOKEN_DENOM,
      currency: null,
    },
    sync: {
      ...syncBase,
      indexedFromChain: true,
      indexedAt: new Date().toISOString(),
      sourceTxHash: input.sourceTxHash,
    },
  } satisfies Prisma.InputJsonObject;
}

function getOnchainIdFromMetadata(
  metadata: Prisma.JsonValue | null | undefined,
  key: "agentId" | "serviceId",
) {
  const onchain = getNestedRecord(getJsonRecord(metadata), "onchain");
  return getStringValue(onchain, key);
}

function getPendingPayableAmountFromMetadata(
  metadata: Prisma.JsonValue | null | undefined,
) {
  const payment = getNestedRecord(getJsonRecord(metadata), "payment");
  return getStringValue(payment, "payableAmount");
}

function mapRegistryAgentStatus(active: boolean | null) {
  return active === false ? AgentStatus.PAUSED : AgentStatus.ACTIVE;
}

function mapRegistryServiceStatus(active: boolean | null) {
  return active === false ? AgentServiceStatus.PAUSED : AgentServiceStatus.ACTIVE;
}

async function generateUniqueAgentSlug(
  db: Prisma.TransactionClient,
  name: string,
) {
  const baseSlug = slugify(name) || "agent";
  let candidateSlug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db.agent.findUnique({
      where: {
        slug: candidateSlug,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidateSlug;
    }

    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function generateUniqueServiceSlug(
  db: Prisma.TransactionClient,
  agentId: string,
  title: string,
) {
  const baseSlug = slugify(title) || "service";
  let candidateSlug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db.agentService.findUnique({
      where: {
        agentId_slug: {
          agentId,
          slug: candidateSlug,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidateSlug;
    }

    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function resolveUserIdForWalletAddress(
  db: Prisma.TransactionClient,
  chainId: string,
  address: string | null,
) {
  if (!address) {
    return null;
  }

  const wallet = await db.wallet.findFirst({
    where: {
      chainId,
      address: {
        equals: address,
        mode: "insensitive",
      },
      userId: {
        not: null,
      },
    },
    select: {
      userId: true,
    },
  });

  return wallet?.userId ?? null;
}

async function listOwnerAgentsForRegistrySync(
  db: Prisma.TransactionClient,
  ownerId: string,
) {
  return db.agent.findMany({
    where: {
      ownerId,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    take: 50,
    select: {
      id: true,
      ownerId: true,
      name: true,
      category: true,
      description: true,
      pricingModel: true,
      status: true,
      appchainId: true,
      treasuryAddress: true,
      initUsername: true,
      metadata: true,
      createdAt: true,
    },
  });
}

async function listAgentServicesForRegistrySync(
  db: Prisma.TransactionClient,
  agentId: string,
) {
  return db.agentService.findMany({
    where: {
      agentId,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    take: 50,
    select: {
      id: true,
      agentId: true,
      title: true,
      description: true,
      status: true,
      priceAmount: true,
      priceCurrency: true,
      priceDenom: true,
      metadata: true,
      createdAt: true,
    },
  });
}

function getRegistryPayload(event: NormalizedContractEvent) {
  return getJsonRecord(event.parsedPayload);
}

async function ensureBackendAgentForRegistryEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
  input: {
    onchainAgentId: string;
    ownerAddress: string | null;
    treasuryAddress: string | null;
    name: string | null;
    category: string | null;
    description: string | null;
    initUsername: string | null;
    active: boolean | null;
  },
) {
  const ownerId = await resolveUserIdForWalletAddress(db, event.chainId, input.ownerAddress);
  if (!ownerId) {
    throw createHttpError(
      422,
      `AgentRegistry event ${event.eventName} could not be matched to a wallet-backed user`,
    );
  }

  const candidates = await listOwnerAgentsForRegistrySync(db, ownerId);
  const byOnchainId =
    candidates.find(
      (candidate) =>
        getOnchainIdFromMetadata(candidate.metadata, "agentId") === input.onchainAgentId,
    ) ?? null;

  const byPayload =
    candidates.find((candidate) => {
      const sameName = input.name ? candidate.name === input.name : true;
      const sameCategory = input.category ? candidate.category === input.category : true;
      const sameDescription = input.description
        ? candidate.description === input.description
        : true;
      const sameTreasury = input.treasuryAddress
        ? candidate.treasuryAddress.toLowerCase() === input.treasuryAddress.toLowerCase()
        : true;
      const sameUsername =
        normalizeOptionalString(candidate.initUsername) ===
        normalizeOptionalString(input.initUsername);

      return sameName && sameCategory && sameDescription && sameTreasury && sameUsername;
    }) ?? null;

  const matchedAgent = byOnchainId ?? byPayload;
  const metadata = buildAgentOnchainMetadata({
    existing: matchedAgent?.metadata,
    chainId: event.chainId,
    contractAddress: event.contractAddress,
    onchainAgentId: input.onchainAgentId,
    sourceTxHash: event.txHash,
  });

  if (matchedAgent) {
    return db.agent.update({
      where: {
        id: matchedAgent.id,
      },
      data: {
        name: input.name ?? matchedAgent.name,
        category: input.category ?? matchedAgent.category,
        description: input.description ?? matchedAgent.description,
        status: mapRegistryAgentStatus(input.active),
        appchainId: matchedAgent.appchainId ?? event.chainId,
        treasuryAddress: input.treasuryAddress ?? matchedAgent.treasuryAddress,
        initUsername:
          normalizeOptionalString(input.initUsername) ?? matchedAgent.initUsername,
        metadata,
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
        category: true,
        description: true,
        pricingModel: true,
        status: true,
        appchainId: true,
        treasuryAddress: true,
        initUsername: true,
        metadata: true,
        createdAt: true,
      },
    });
  }

  const name = input.name ?? `Agent ${input.onchainAgentId}`;
  const category = input.category ?? "General";
  const description =
    input.description ??
    "Recovered from the live AgentRegistry event stream.";
  const slug = await generateUniqueAgentSlug(db, name);

  return db.agent.create({
    data: {
      ownerId,
      name,
      slug,
      category,
      description,
      pricingModel: AgentPricingModel.CUSTOM,
      status: mapRegistryAgentStatus(input.active),
      appchainId: event.chainId,
      treasuryAddress:
        input.treasuryAddress ??
        input.ownerAddress ??
        "unknown-treasury",
      initUsername: normalizeOptionalString(input.initUsername),
      metadata,
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
      category: true,
      description: true,
      pricingModel: true,
      status: true,
      appchainId: true,
      treasuryAddress: true,
      initUsername: true,
      metadata: true,
      createdAt: true,
    },
  });
}

async function findAgentByOnchainId(
  db: Prisma.TransactionClient,
  ownerId: string,
  onchainAgentId: string,
) {
  const candidates = await listOwnerAgentsForRegistrySync(db, ownerId);
  return (
    candidates.find(
      (candidate) =>
        getOnchainIdFromMetadata(candidate.metadata, "agentId") === onchainAgentId,
    ) ?? null
  );
}

async function upsertServiceForRegistryEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
  input: {
    onchainAgentId: string;
    onchainServiceId: string;
    ownerAddress: string | null;
    title: string | null;
    description: string | null;
    rawPrice: string | null;
    active: boolean | null;
  },
) {
  const ownerId = await resolveUserIdForWalletAddress(db, event.chainId, input.ownerAddress);
  if (!ownerId) {
    throw createHttpError(
      422,
      `AgentRegistry event ${event.eventName} could not be matched to a wallet-backed user`,
    );
  }

  const backendAgent = await findAgentByOnchainId(db, ownerId, input.onchainAgentId);
  if (!backendAgent) {
    throw createHttpError(
      422,
      `ServiceCreated event could not be matched to an indexed backend agent for on-chain agent ${input.onchainAgentId}`,
    );
  }

  const amount =
    parseEventAmountToDecimal(input.rawPrice, null) ??
    new Prisma.Decimal(0);

  if (amount.lte(0)) {
    throw createHttpError(422, "ServiceCreated event is missing a valid service price");
  }

  const displayAmount = amount.toString();
  const candidates = await listAgentServicesForRegistrySync(db, backendAgent.id);
  const matchedService =
    candidates.find(
      (candidate) =>
        getOnchainIdFromMetadata(candidate.metadata, "serviceId") === input.onchainServiceId,
    ) ??
    candidates.find((candidate) => {
      const sameTitle = input.title ? candidate.title === input.title : true;
      const sameDescription = input.description
        ? candidate.description === input.description
        : true;
      const pendingPayableAmount = getPendingPayableAmountFromMetadata(candidate.metadata);
      const samePayableAmount = pendingPayableAmount
        ? pendingPayableAmount === input.rawPrice
        : candidate.priceAmount.equals(amount);

      return sameTitle && sameDescription && samePayableAmount;
    }) ??
    null;

  const metadata = buildServiceMetadata({
    existing: matchedService?.metadata,
    chainId: event.chainId,
    contractAddress: event.contractAddress,
    onchainAgentId: input.onchainAgentId,
    onchainServiceId: input.onchainServiceId,
    payableAmount: input.rawPrice ?? "0",
    displayAmount,
    sourceTxHash: event.txHash,
  });

  if (matchedService) {
    const updatedService = await db.agentService.update({
      where: {
        id: matchedService.id,
      },
      data: {
        title: input.title ?? matchedService.title,
        description: input.description ?? matchedService.description,
        status: mapRegistryServiceStatus(input.active),
        priceAmount: amount,
        priceCurrency: matchedService.priceCurrency,
        priceDenom: matchedService.priceDenom || env.INDEXER_NATIVE_TOKEN_DENOM,
        metadata,
      },
      select: {
        id: true,
      },
    });

    return {
      serviceId: updatedService.id,
      agentId: backendAgent.id,
    };
  }

  const title = input.title ?? `Service ${input.onchainServiceId}`;
  const slug = await generateUniqueServiceSlug(db, backendAgent.id, title);
  const createdService = await db.agentService.create({
    data: {
      agentId: backendAgent.id,
      slug,
      title,
      description:
        input.description ??
        "Recovered from the live AgentRegistry event stream.",
      status: mapRegistryServiceStatus(input.active),
      priceAmount: amount,
      priceCurrency: null,
      priceDenom: env.INDEXER_NATIVE_TOKEN_DENOM,
      metadata,
    },
    select: {
      id: true,
    },
  });

  return {
    serviceId: createdService.id,
    agentId: backendAgent.id,
  };
}

async function findOrderLifecycleRecord(
  db: Prisma.TransactionClient,
  orderId: string,
): Promise<OrderLifecycleRecord | null> {
  return db.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
      agentId: true,
      status: true,
      paymentStatus: true,
      deliveryStatus: true,
      onchainOrderId: true,
      paymentReference: true,
      txHash: true,
      quotedPriceAmount: true,
      finalPaidAmount: true,
      currency: true,
      denom: true,
      deliveryUrl: true,
      deliveryText: true,
      paidAt: true,
      deliveredAt: true,
      completedAt: true,
      cancelledAt: true,
      failedAt: true,
      agent: {
        select: {
          treasuryAddress: true,
        },
      },
    },
  });
}

async function findMatchedOrderForEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<MatchedOrder | null> {
  if (event.references.orderId) {
    const order = await findOrderForPaymentCreate(db, event.references.orderId);
    if (order) {
      return order;
    }
  }

  const onchainOrderId = parseBigIntString(event.orderDetails.onchainOrderId);
  if (onchainOrderId !== null) {
    const order = await findOrderByOnchainOrderId(db, onchainOrderId);
    if (order) {
      return order;
    }
  }

  if (event.txHash) {
    const order = await findOrderByTxHash(db, event.txHash);
    if (order) {
      return order;
    }
  }

  if (event.references.paymentReference) {
    const order = await findOrderByPaymentReference(db, event.references.paymentReference);
    if (order) {
      return order;
    }
  }

  return null;
}

async function findOrderLifecycleRecordForEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<OrderLifecycleRecord | null> {
  const matchedOrder = await findMatchedOrderForEvent(db, event);
  if (!matchedOrder) {
    return null;
  }

  return findOrderLifecycleRecord(db, matchedOrder.id);
}

function createMissingOrderMatchError(event: NormalizedContractEvent) {
  return createHttpError(
    422,
    `Chain event ${event.eventName} could not be matched to an order`,
  );
}

async function applyLegacyPaymentMutation(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  const mutation = mapContractEventToPaymentMutation(event);

  if (!mutation) {
    return {
      payment: null,
      orderId: event.references.orderId,
      agentId: event.references.agentId,
      shouldTriggerTaskProcessing: false,
    };
  }

  const existingPayment = await findPaymentForEventMatch(db, {
    paymentId: mutation.paymentId,
    txHash: mutation.txHash,
    orderId: mutation.orderId,
    paymentReference: mutation.paymentReference,
  });

  if (existingPayment) {
    const updatedPayment = await updatePaymentRecord(
      db,
      existingPayment.id,
      buildPaymentUpdateData({
        paymentReference: mutation.paymentReference ?? existingPayment.paymentReference,
        txHash: mutation.txHash ?? existingPayment.txHash,
        amount: mutation.amount ? new Prisma.Decimal(mutation.amount) : undefined,
        currency: mutation.currency ?? existingPayment.currency,
        denom: mutation.denom ?? existingPayment.denom,
        payerAddress: mutation.sender ?? existingPayment.payerAddress,
        recipientAddress: mutation.recipient ?? existingPayment.recipientAddress,
        status: mutation.status,
        blockHeight: mutation.blockHeight,
        failureReason:
          mutation.status === PaymentStatus.FAILED
            ? mutation.failureReason ?? "Payment failed on-chain"
            : null,
        confirmedAt:
          mutation.status === PaymentStatus.CONFIRMED
            ? mutation.occurredAt ?? new Date()
            : existingPayment.confirmedAt,
        confirmationCount:
          mutation.status === PaymentStatus.CONFIRMED
            ? Math.max(existingPayment.confirmationCount, 1)
            : existingPayment.confirmationCount,
      }),
    );

    await syncOrderFromPaymentStatus(db, {
      orderId: updatedPayment.orderId,
      status: updatedPayment.status,
      amount: updatedPayment.amount,
      paymentReference: updatedPayment.paymentReference,
      txHash: updatedPayment.txHash,
      failureReason: updatedPayment.failureReason,
      occurredAt: updatedPayment.confirmedAt ?? mutation.occurredAt,
    });

    return {
      payment: updatedPayment,
      orderId: updatedPayment.orderId,
      agentId: updatedPayment.agentId,
      shouldTriggerTaskProcessing: updatedPayment.status === PaymentStatus.CONFIRMED,
    };
  }

  const matchedOrder =
    (mutation.orderId ? await findOrderForPaymentCreate(db, mutation.orderId) : null) ??
    (mutation.paymentReference
      ? await findOrderByPaymentReference(db, mutation.paymentReference)
      : null);

  if (!matchedOrder) {
    throw createMissingOrderMatchError(event);
  }

  const amount = mutation.amount
    ? new Prisma.Decimal(mutation.amount)
    : matchedOrder.quotedPriceAmount;

  const denom = mutation.denom ?? matchedOrder.denom;
  const currency = mutation.currency ?? matchedOrder.currency ?? null;
  const recipientAddress = mutation.recipient ?? matchedOrder.agent.treasuryAddress;

  if (!amount || !denom || !mutation.sender || !recipientAddress) {
    throw createHttpError(
      422,
      "Chain event is missing the payment details required to create a payment record",
    );
  }

  const createdPayment = await createPaymentRecord(
    db,
    buildPaymentWriteData({
      orderId: matchedOrder.id,
      agentId: matchedOrder.agentId,
      chainId: mutation.chainId,
      paymentReference: mutation.paymentReference,
      txHash: mutation.txHash,
      amount,
      currency,
      denom,
      payerAddress: mutation.sender,
      recipientAddress,
      status: mutation.status,
      blockHeight: mutation.blockHeight,
      confirmedAt:
        mutation.status === PaymentStatus.CONFIRMED ? mutation.occurredAt ?? new Date() : null,
      failureReason: mutation.failureReason,
      confirmationCount: mutation.status === PaymentStatus.CONFIRMED ? 1 : 0,
    }),
  );

  await syncOrderFromPaymentStatus(db, {
    orderId: createdPayment.orderId,
    status: createdPayment.status,
    amount: createdPayment.amount,
    paymentReference: createdPayment.paymentReference,
    txHash: createdPayment.txHash,
    failureReason: createdPayment.failureReason,
    occurredAt: createdPayment.confirmedAt ?? mutation.occurredAt,
  });

  return {
    payment: createdPayment,
    orderId: createdPayment.orderId,
    agentId: createdPayment.agentId,
    shouldTriggerTaskProcessing: createdPayment.status === PaymentStatus.CONFIRMED,
  };
}

async function applyOrderCreatedEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  const matchedOrder = await findMatchedOrderForEvent(db, event);
  if (!matchedOrder) {
    throw createMissingOrderMatchError(event);
  }

  const onchainOrderId = parseBigIntString(event.orderDetails.onchainOrderId);
  const amount =
    parseEventAmountToDecimal(
      event.paymentDetails.amount,
      matchedOrder.finalPaidAmount ?? matchedOrder.quotedPriceAmount,
    ) ?? matchedOrder.quotedPriceAmount;
  const feeAmount =
    parseEventAmountToDecimal(event.orderDetails.platformFeeAmount, new Prisma.Decimal(0)) ??
    new Prisma.Decimal(0);
  const sender = event.orderDetails.customer ?? event.paymentDetails.sender;
  const paymentReference = matchedOrder.paymentReference ?? event.references.paymentReference;

  if (!sender) {
    throw createHttpError(422, "OrderCreated event is missing the customer address");
  }

  let payment = await findPaymentForEventMatch(db, {
    paymentId: event.references.paymentId,
    txHash: event.txHash,
    orderId: matchedOrder.id,
    paymentReference,
  });

  if (payment) {
    payment = await updatePaymentRecord(
      db,
      payment.id,
      buildPaymentUpdateData({
        paymentReference: paymentReference ?? payment.paymentReference,
        txHash: event.txHash,
        amount,
        feeAmount,
        currency: matchedOrder.currency,
        denom: matchedOrder.denom,
        payerAddress: sender,
        recipientAddress: matchedOrder.agent.treasuryAddress,
        status: PaymentStatus.CONFIRMED,
        blockHeight: event.blockHeight,
        confirmedAt: event.blockTimestamp ?? payment.confirmedAt ?? new Date(),
        confirmationCount: Math.max(payment.confirmationCount, 1),
      }),
    );
  } else {
    payment = await createPaymentRecord(
      db,
      buildPaymentWriteData({
        orderId: matchedOrder.id,
        agentId: matchedOrder.agentId,
        chainId: event.chainId,
        paymentReference,
        txHash: event.txHash,
        amount,
        feeAmount,
        currency: matchedOrder.currency,
        denom: matchedOrder.denom,
        payerAddress: sender,
        recipientAddress: matchedOrder.agent.treasuryAddress,
        status: PaymentStatus.CONFIRMED,
        blockHeight: event.blockHeight,
        confirmedAt: event.blockTimestamp ?? new Date(),
        confirmationCount: 1,
      }),
    );
  }

  await syncOrderFromPaymentStatus(db, {
    orderId: matchedOrder.id,
    status: PaymentStatus.CONFIRMED,
    amount: payment.amount,
    onchainOrderId,
    paymentReference,
    txHash: event.txHash,
    occurredAt: event.blockTimestamp ?? payment.confirmedAt,
  });

  return {
    payment,
    orderId: matchedOrder.id,
    agentId: matchedOrder.agentId,
    shouldTriggerTaskProcessing: true,
  };
}

async function applyOrderStatusChangedEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  const order = await findOrderLifecycleRecordForEvent(db, event);
  if (!order) {
    throw createMissingOrderMatchError(event);
  }

  const onchainOrderId = parseBigIntString(event.orderDetails.onchainOrderId);
  const nextStatus = normalizeChainOrderStatus(event.orderDetails.newStatus);
  const occurredAt = event.blockTimestamp ?? new Date();
  const data: Prisma.OrderUpdateInput = {
    onchainOrderId: onchainOrderId ?? order.onchainOrderId ?? undefined,
    txHash: order.txHash ?? event.txHash,
  };

  switch (nextStatus) {
    case "PAID":
      data.status = OrderStatus.PAID;
      data.paymentStatus = OrderPaymentStatus.PAID;
      data.paidAt = order.paidAt ?? occurredAt;
      data.finalPaidAmount = order.finalPaidAmount ?? order.quotedPriceAmount;
      break;
    case "IN_PROGRESS":
      data.status = OrderStatus.IN_PROGRESS;
      data.deliveryStatus = DeliveryStatus.IN_PROGRESS;
      if (order.paymentStatus !== OrderPaymentStatus.PAID) {
        data.paymentStatus = OrderPaymentStatus.PAID;
      }
      break;
    case "DELIVERED":
      data.status = OrderStatus.DELIVERED;
      data.deliveryStatus = DeliveryStatus.DELIVERED;
      data.deliveredAt = order.deliveredAt ?? occurredAt;
      if (event.orderDetails.deliveryRef && !order.deliveryUrl) {
        data.deliveryUrl = event.orderDetails.deliveryRef;
      }
      break;
    case "COMPLETED":
      data.status = OrderStatus.COMPLETED;
      data.deliveryStatus = DeliveryStatus.DELIVERED;
      data.completedAt = order.completedAt ?? occurredAt;
      break;
    case "CANCELLED":
      data.status = OrderStatus.CANCELLED;
      data.paymentStatus = OrderPaymentStatus.CANCELLED;
      data.deliveryStatus = DeliveryStatus.CANCELLED;
      data.cancelledAt = order.cancelledAt ?? occurredAt;
      break;
    case "REFUNDED":
      data.status = OrderStatus.CANCELLED;
      data.paymentStatus = OrderPaymentStatus.REFUNDED;
      data.deliveryStatus = DeliveryStatus.CANCELLED;
      data.cancelledAt = order.cancelledAt ?? occurredAt;
      break;
    case "DISPUTED":
    case "PENDING_PAYMENT":
    default:
      if (onchainOrderId === null && !event.txHash) {
        return {
          payment: null,
          orderId: order.id,
          agentId: order.agentId,
          shouldTriggerTaskProcessing: false,
        };
      }
      break;
  }

  await db.order.update({
    where: {
      id: order.id,
    },
    data,
  });

  return {
    payment: null,
    orderId: order.id,
    agentId: order.agentId,
    shouldTriggerTaskProcessing: nextStatus === "PAID",
  };
}

async function applyDeliverySubmittedEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  const order = await findOrderLifecycleRecordForEvent(db, event);
  if (!order) {
    throw createMissingOrderMatchError(event);
  }

  const onchainOrderId = parseBigIntString(event.orderDetails.onchainOrderId);

  await db.order.update({
    where: {
      id: order.id,
    },
    data: {
      onchainOrderId: onchainOrderId ?? order.onchainOrderId ?? undefined,
      ...(event.orderDetails.deliveryRef
        ? {
            deliveryUrl: event.orderDetails.deliveryRef,
          }
        : {}),
      txHash: order.txHash ?? event.txHash,
    },
  });

  return {
    payment: null,
    orderId: order.id,
    agentId: order.agentId,
    shouldTriggerTaskProcessing: false,
  };
}

async function applyFundsReleasedEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  const order = await findOrderLifecycleRecordForEvent(db, event);
  if (!order) {
    throw createMissingOrderMatchError(event);
  }

  const onchainOrderId = parseBigIntString(event.orderDetails.onchainOrderId);
  const occurredAt = event.blockTimestamp ?? new Date();
  const amount = order.finalPaidAmount ?? order.quotedPriceAmount;
  const feeAmount =
    parseEventAmountToDecimal(event.orderDetails.platformFeeAmount, new Prisma.Decimal(0)) ??
    new Prisma.Decimal(0);
  const recipientAddress = event.orderDetails.agentTreasury ?? order.agent.treasuryAddress;

  let payment = await findPaymentForEventMatch(db, {
    paymentId: event.references.paymentId,
    txHash: event.txHash,
    orderId: order.id,
    paymentReference: order.paymentReference,
  });

  if (payment) {
    payment = await updatePaymentRecord(
      db,
      payment.id,
      buildPaymentUpdateData({
        txHash: event.txHash,
        amount,
        feeAmount,
        currency: order.currency,
        denom: order.denom,
        recipientAddress,
        status: PaymentStatus.CONFIRMED,
        blockHeight: event.blockHeight,
        confirmedAt: payment.confirmedAt ?? occurredAt,
        finalizedAt: occurredAt,
        confirmationCount: Math.max(payment.confirmationCount, 1),
      }),
    );
  } else {
    const sender = event.orderDetails.customer ?? event.paymentDetails.sender;

    if (!sender) {
      throw createHttpError(422, "FundsReleased event is missing the original payer address");
    }

    payment = await createPaymentRecord(
      db,
      buildPaymentWriteData({
        orderId: order.id,
        agentId: order.agentId,
        chainId: event.chainId,
        paymentReference: order.paymentReference,
        txHash: event.txHash,
        amount,
        feeAmount,
        currency: order.currency,
        denom: order.denom,
        payerAddress: sender,
        recipientAddress,
        status: PaymentStatus.CONFIRMED,
        blockHeight: event.blockHeight,
        confirmedAt: occurredAt,
        finalizedAt: occurredAt,
        confirmationCount: 1,
      }),
    );
  }

  await db.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      confirmationStatus: PaymentConfirmationStatus.FINALIZED,
      finalizedAt: occurredAt,
    },
  });

  await db.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: OrderStatus.COMPLETED,
      paymentStatus: OrderPaymentStatus.PAID,
      deliveryStatus: DeliveryStatus.DELIVERED,
      onchainOrderId: onchainOrderId ?? order.onchainOrderId ?? undefined,
      completedAt: order.completedAt ?? occurredAt,
      txHash: order.txHash ?? event.txHash,
    },
  });

  return {
    payment,
    orderId: order.id,
    agentId: order.agentId,
    shouldTriggerTaskProcessing: false,
  };
}

async function applyRefundedEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  const order = await findOrderLifecycleRecordForEvent(db, event);
  if (!order) {
    throw createMissingOrderMatchError(event);
  }

  const onchainOrderId = parseBigIntString(event.orderDetails.onchainOrderId);
  const occurredAt = event.blockTimestamp ?? new Date();
  const amount =
    parseEventAmountToDecimal(
      event.orderDetails.amountRefunded,
      order.finalPaidAmount ?? order.quotedPriceAmount,
    ) ?? order.quotedPriceAmount;
  const recipientAddress = event.orderDetails.customer ?? event.paymentDetails.sender;

  if (!recipientAddress) {
    throw createHttpError(422, "Refunded event is missing the customer address");
  }

  let payment = await findPaymentForEventMatch(db, {
    paymentId: event.references.paymentId,
    txHash: event.txHash,
    orderId: order.id,
    paymentReference: order.paymentReference,
  });

  if (payment) {
    payment = await updatePaymentRecord(
      db,
      payment.id,
      buildPaymentUpdateData({
        txHash: event.txHash,
        amount,
        currency: order.currency,
        denom: order.denom,
        recipientAddress,
        status: PaymentStatus.REFUNDED,
        blockHeight: event.blockHeight,
        confirmedAt: payment.confirmedAt ?? occurredAt,
        finalizedAt: occurredAt,
        confirmationCount: Math.max(payment.confirmationCount, 1),
      }),
    );
  } else {
    payment = await createPaymentRecord(
      db,
      buildPaymentWriteData({
        orderId: order.id,
        agentId: order.agentId,
        chainId: event.chainId,
        paymentReference: order.paymentReference,
        txHash: event.txHash,
        amount,
        currency: order.currency,
        denom: order.denom,
        payerAddress: recipientAddress,
        recipientAddress,
        status: PaymentStatus.REFUNDED,
        blockHeight: event.blockHeight,
        confirmedAt: occurredAt,
        finalizedAt: occurredAt,
        confirmationCount: 1,
      }),
    );
  }

  await db.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      confirmationStatus: PaymentConfirmationStatus.FINALIZED,
      finalizedAt: occurredAt,
    },
  });

  await db.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: OrderStatus.CANCELLED,
      paymentStatus: OrderPaymentStatus.REFUNDED,
      deliveryStatus: DeliveryStatus.CANCELLED,
      onchainOrderId: onchainOrderId ?? order.onchainOrderId ?? undefined,
      cancelledAt: order.cancelledAt ?? occurredAt,
      txHash: order.txHash ?? event.txHash,
    },
  });

  return {
    payment,
    orderId: order.id,
    agentId: order.agentId,
    shouldTriggerTaskProcessing: false,
  };
}

async function applyAgentCreatedEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  const payload = getRegistryPayload(event);
  const onchainAgentId = getStringValue(payload, "onchainAgentId");

  if (!onchainAgentId) {
    throw createHttpError(422, "AgentCreated event is missing the on-chain agent id");
  }

  const agent = await ensureBackendAgentForRegistryEvent(db, event, {
    onchainAgentId,
    ownerAddress: getStringValue(payload, "owner") ?? getStringValue(payload, "sender"),
    treasuryAddress: getStringValue(payload, "treasury"),
    name: getStringValue(payload, "name"),
    category: getStringValue(payload, "category"),
    description: getStringValue(payload, "description"),
    initUsername: getStringValue(payload, "initUsername"),
    active: getBooleanValue(payload, "active"),
  });

  return {
    payment: null,
    orderId: null,
    agentId: agent.id,
    shouldTriggerTaskProcessing: false,
  };
}

async function applyServiceCreatedEvent(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  const payload = getRegistryPayload(event);
  const onchainAgentId = getStringValue(payload, "onchainAgentId");
  const onchainServiceId = getStringValue(payload, "onchainServiceId");

  if (!onchainAgentId || !onchainServiceId) {
    throw createHttpError(
      422,
      "ServiceCreated event is missing the on-chain service identifiers",
    );
  }

  const result = await upsertServiceForRegistryEvent(db, event, {
    onchainAgentId,
    onchainServiceId,
    ownerAddress: getStringValue(payload, "owner") ?? getStringValue(payload, "sender"),
    title: getStringValue(payload, "title"),
    description: getStringValue(payload, "description"),
    rawPrice: getStringValue(payload, "price"),
    active: getBooleanValue(payload, "active"),
  });

  return {
    payment: null,
    orderId: null,
    agentId: result.agentId,
    shouldTriggerTaskProcessing: false,
  };
}

async function applyServiceEscrowMutation(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  switch (event.eventName) {
    case "order.created":
      return applyOrderCreatedEvent(db, event);
    case "order.status.changed":
      return applyOrderStatusChangedEvent(db, event);
    case "delivery.submitted":
      return applyDeliverySubmittedEvent(db, event);
    case "funds.released":
      return applyFundsReleasedEvent(db, event);
    case "refunded":
      return applyRefundedEvent(db, event);
    default:
      return {
        payment: null,
        orderId: event.references.orderId,
        agentId: event.references.agentId,
        shouldTriggerTaskProcessing: false,
      };
  }
}

async function applyAgentRegistryMutation(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  switch (event.eventName) {
    case "agent.created":
      return applyAgentCreatedEvent(db, event);
    case "service.created":
      return applyServiceCreatedEvent(db, event);
    default:
      return {
        payment: null,
        orderId: null,
        agentId: event.references.agentId,
        shouldTriggerTaskProcessing: false,
      };
  }
}

async function applyIndexedMutation(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<IndexedEventMutationResult> {
  if (event.eventName === "agent.created" || event.eventName === "service.created") {
    return applyAgentRegistryMutation(db, event);
  }

  if (
    event.eventName === "order.created" ||
    event.eventName === "order.status.changed" ||
    event.eventName === "delivery.submitted" ||
    event.eventName === "funds.released" ||
    event.eventName === "refunded"
  ) {
    return applyServiceEscrowMutation(db, event);
  }

  return applyLegacyPaymentMutation(db, event);
}

export async function indexContractEvent(
  db: PrismaClient,
  event: NormalizedContractEvent,
): Promise<{
  contractEvent: ContractEventRecord;
  duplicate: boolean;
  processed: boolean;
  orderId: string | null;
  paymentStatus: PaymentStatus | null;
  shouldTriggerTaskProcessing: boolean;
}> {
  const seededEvent = await upsertContractEventSeed(db, event);

  if (seededEvent.status === "PROCESSED") {
    return {
      contractEvent: seededEvent,
      duplicate: true,
      processed: true,
      orderId: seededEvent.orderId,
      paymentStatus: null,
      shouldTriggerTaskProcessing: false,
    };
  }

  try {
    const processed = await db.$transaction(async (tx) => {
      const currentEvent = await upsertContractEventSeed(tx, event);

      if (currentEvent.status === "PROCESSED") {
        return {
          contractEvent: currentEvent,
          orderId: currentEvent.orderId,
          paymentStatus: null,
          shouldTriggerTaskProcessing: false,
        };
      }

      const processingEvent = await incrementContractEventProcessingAttempt(tx, currentEvent.id);
      const mutation = await applyIndexedMutation(tx, event);

      if (mutation.payment) {
        await recomputeDailyTreasurySnapshot(tx, {
          agentId: mutation.payment.agentId,
          denom: mutation.payment.denom,
          currency: mutation.payment.currency,
          referenceTime: event.blockTimestamp ?? new Date(),
        });
      }

      const contractEvent = await markContractEventProcessed(tx, processingEvent.id, {
        agentId: mutation.agentId ?? currentEvent.agentId,
        orderId: mutation.orderId ?? currentEvent.orderId,
        paymentId: mutation.payment?.id ?? currentEvent.paymentId,
      });

      return {
        contractEvent,
        orderId: mutation.orderId,
        paymentStatus: mutation.payment?.status ?? null,
        shouldTriggerTaskProcessing: mutation.shouldTriggerTaskProcessing,
      };
    });

    return {
      contractEvent: processed.contractEvent,
      duplicate: false,
      processed: true,
      orderId: processed.orderId,
      paymentStatus: processed.paymentStatus,
      shouldTriggerTaskProcessing: processed.shouldTriggerTaskProcessing,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown indexing failure";

    logger.error(
      {
        err: error,
        eventKey: event.eventKey,
        txHash: event.txHash,
      },
      "Contract event indexing failed",
    );

    const failedEvent = await markContractEventFailed(db, seededEvent.id, message);

    return {
      contractEvent: failedEvent,
      duplicate: false,
      processed: false,
      orderId: null,
      paymentStatus: null,
      shouldTriggerTaskProcessing: false,
    };
  }
}
