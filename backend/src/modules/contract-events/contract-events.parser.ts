import type { ContractType, PaymentStatus, Prisma } from "@prisma/client";

import type { IngestContractEventBody } from "./contract-events.schemas.js";

const paymentEventAliases: Record<string, string> = {
  paymentinitiated: "payment.initiated",
  "payment.initiated": "payment.initiated",
  "payment.pending": "payment.pending",
  paymentpending: "payment.pending",
  "payment.confirmed": "payment.confirmed",
  paymentconfirmed: "payment.confirmed",
  "payment.received": "payment.confirmed",
  paymentreceived: "payment.confirmed",
  "payment.settled": "payment.confirmed",
  paymentsettled: "payment.confirmed",
  "payment.failed": "payment.failed",
  paymentfailed: "payment.failed",
};

export type NormalizedContractEvent = {
  eventKey: string;
  chainId: string;
  contractType: ContractType;
  contractAddress: string;
  txHash: string;
  blockHeight: bigint;
  blockTimestamp: Date | null;
  eventName: string;
  eventIndex: number | null;
  rawPayload: Prisma.InputJsonObject | null;
  parsedPayload: Prisma.InputJsonObject;
  references: {
    paymentId: string | null;
    orderId: string | null;
    agentId: string | null;
    paymentReference: string | null;
  };
  paymentDetails: {
    paymentId: string | null;
    orderId: string | null;
    agentId: string | null;
    paymentReference: string | null;
    amount: string | null;
    currency: string | null;
    denom: string | null;
    sender: string | null;
    recipient: string | null;
    status: PaymentStatus | null;
  };
  orderDetails: {
    onchainOrderId: string | null;
    onchainAgentId: string | null;
    onchainServiceId: string | null;
    customer: string | null;
    actor: string | null;
    agentTreasury: string | null;
    feeTreasury: string | null;
    platformFeeAmount: string | null;
    agentPayoutAmount: string | null;
    amountRefunded: string | null;
    deliveryRef: string | null;
    previousStatus: string | null;
    newStatus: string | null;
  };
};

function compactJsonObject(
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonObject | null {
  if (!value) {
    return null;
  }

  const compacted = Object.entries(value).reduce<Record<string, Prisma.InputJsonValue>>(
    (acc, [key, entryValue]) => {
    if (entryValue !== undefined) {
      acc[key] = entryValue as Prisma.InputJsonValue;
    }

    return acc;
    },
    {},
  );

  return compacted as Prisma.InputJsonObject;
}

function normalizeEventName(value: string) {
  const withWordBoundaries = value.replace(/([a-z0-9])([A-Z])/g, "$1.$2");
  const normalizedKey = withWordBoundaries
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return paymentEventAliases[normalizedKey] ?? normalizedKey;
}

function buildEventKey(input: {
  eventKey?: string;
  chainId: string;
  txHash: string;
  eventIndex?: number;
  eventName: string;
}) {
  if (input.eventKey) {
    return input.eventKey.trim();
  }

  return `${input.chainId}:${input.txHash}:${input.eventIndex ?? 0}:${input.eventName}`;
}

function looksLikeCuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z][a-z0-9]{7,}$/i.test(value) &&
    value.includes("c")
  );
}

function pickBackendReference(
  value: Record<string, unknown>,
  canonicalKey: "paymentId" | "orderId" | "agentId",
) {
  const directValue = value[canonicalKey];
  if (looksLikeCuid(directValue)) {
    return directValue;
  }

  const prefixedValue = value[`backend${canonicalKey.charAt(0).toUpperCase()}${canonicalKey.slice(1)}`];
  return looksLikeCuid(prefixedValue) ? prefixedValue : null;
}

export function parseContractEventInput(
  input: IngestContractEventBody,
): NormalizedContractEvent {
  const eventName = normalizeEventName(input.eventName);
  const parsedPayload = compactJsonObject(input.parsedPayload as Record<string, unknown>) ?? {};
  const payload = input.parsedPayload as Record<string, unknown>;
  const paymentId = pickBackendReference(payload, "paymentId");
  const orderId = pickBackendReference(payload, "orderId");
  const agentId = pickBackendReference(payload, "agentId");

  return {
    eventKey: buildEventKey({
      eventKey: input.eventKey,
      chainId: input.chainId,
      txHash: input.txHash,
      eventIndex: input.eventIndex,
      eventName,
    }),
    chainId: input.chainId,
    contractType: input.contractType,
    contractAddress: input.contractAddress,
    txHash: input.txHash,
    blockHeight: input.blockHeight,
    blockTimestamp: input.blockTimestamp ?? null,
    eventName,
    eventIndex: input.eventIndex ?? null,
    rawPayload: compactJsonObject(input.rawPayload),
    parsedPayload,
    references: {
      paymentId,
      orderId,
      agentId,
      paymentReference: input.parsedPayload.paymentReference ?? null,
    },
    paymentDetails: {
      paymentId,
      orderId,
      agentId,
      paymentReference: input.parsedPayload.paymentReference ?? null,
      amount: input.parsedPayload.amount ?? null,
      currency: input.parsedPayload.currency ?? null,
      denom: input.parsedPayload.denom ?? null,
      sender: input.parsedPayload.sender ?? null,
      recipient: input.parsedPayload.recipient ?? null,
      status: input.parsedPayload.status ?? null,
    },
    orderDetails: {
      onchainOrderId:
        (typeof payload.onchainOrderId === "string" ? payload.onchainOrderId : null) ??
        (typeof payload.orderId === "string" && !looksLikeCuid(payload.orderId)
          ? payload.orderId
          : null),
      onchainAgentId:
        (typeof payload.onchainAgentId === "string" ? payload.onchainAgentId : null) ??
        (typeof payload.agentId === "string" && !looksLikeCuid(payload.agentId)
          ? payload.agentId
          : null),
      onchainServiceId:
        typeof payload.onchainServiceId === "string" ? payload.onchainServiceId : null,
      customer:
        typeof payload.customer === "string"
          ? payload.customer
          : typeof payload.sender === "string"
            ? payload.sender
            : null,
      actor: typeof payload.actor === "string" ? payload.actor : null,
      agentTreasury: typeof payload.agentTreasury === "string" ? payload.agentTreasury : null,
      feeTreasury: typeof payload.feeTreasury === "string" ? payload.feeTreasury : null,
      platformFeeAmount:
        typeof payload.platformFeeAmount === "string" ? payload.platformFeeAmount : null,
      agentPayoutAmount:
        typeof payload.agentPayoutAmount === "string" ? payload.agentPayoutAmount : null,
      amountRefunded:
        typeof payload.amountRefunded === "string" ? payload.amountRefunded : null,
      deliveryRef: typeof payload.deliveryRef === "string" ? payload.deliveryRef : null,
      previousStatus:
        typeof payload.previousStatus === "string" ? payload.previousStatus : null,
      newStatus: typeof payload.newStatus === "string" ? payload.newStatus : null,
    },
  };
}
