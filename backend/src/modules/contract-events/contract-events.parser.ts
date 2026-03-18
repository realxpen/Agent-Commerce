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

export function parseContractEventInput(
  input: IngestContractEventBody,
): NormalizedContractEvent {
  const eventName = normalizeEventName(input.eventName);
  const parsedPayload = compactJsonObject(input.parsedPayload as Record<string, unknown>) ?? {};

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
      paymentId: input.parsedPayload.paymentId ?? null,
      orderId: input.parsedPayload.orderId ?? null,
      agentId: input.parsedPayload.agentId ?? null,
      paymentReference: input.parsedPayload.paymentReference ?? null,
    },
    paymentDetails: {
      paymentId: input.parsedPayload.paymentId ?? null,
      orderId: input.parsedPayload.orderId ?? null,
      agentId: input.parsedPayload.agentId ?? null,
      paymentReference: input.parsedPayload.paymentReference ?? null,
      amount: input.parsedPayload.amount ?? null,
      currency: input.parsedPayload.currency ?? null,
      denom: input.parsedPayload.denom ?? null,
      sender: input.parsedPayload.sender ?? null,
      recipient: input.parsedPayload.recipient ?? null,
      status: input.parsedPayload.status ?? null,
    },
  };
}
