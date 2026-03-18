import { PaymentStatus } from "@prisma/client";

import type { NormalizedContractEvent } from "./contract-events.parser.js";

export type IndexedPaymentMutation = {
  paymentId: string | null;
  orderId: string | null;
  agentId: string | null;
  paymentReference: string | null;
  chainId: string;
  txHash: string;
  amount: string | null;
  currency: string | null;
  denom: string | null;
  sender: string | null;
  recipient: string | null;
  status: PaymentStatus;
  blockHeight: bigint;
  occurredAt: Date | null;
  failureReason: string | null;
};

const paymentEventStatusByName: Record<string, PaymentStatus> = {
  "payment.initiated": PaymentStatus.INITIATED,
  "payment.pending": PaymentStatus.PENDING,
  "payment.confirmed": PaymentStatus.CONFIRMED,
  "payment.failed": PaymentStatus.FAILED,
};

export function mapPaymentStatusFromEvent(event: NormalizedContractEvent) {
  return paymentEventStatusByName[event.eventName] ?? event.paymentDetails.status ?? null;
}

export function mapContractEventToPaymentMutation(
  event: NormalizedContractEvent,
): IndexedPaymentMutation | null {
  const status = mapPaymentStatusFromEvent(event);

  if (!status) {
    return null;
  }

  return {
    paymentId: event.paymentDetails.paymentId,
    orderId: event.paymentDetails.orderId,
    agentId: event.paymentDetails.agentId,
    paymentReference: event.paymentDetails.paymentReference,
    chainId: event.chainId,
    txHash: event.txHash,
    amount: event.paymentDetails.amount,
    currency: event.paymentDetails.currency,
    denom: event.paymentDetails.denom,
    sender: event.paymentDetails.sender,
    recipient: event.paymentDetails.recipient,
    status,
    blockHeight: event.blockHeight,
    occurredAt: event.blockTimestamp,
    failureReason:
      status === PaymentStatus.FAILED
        ? `Chain event ${event.eventName} marked payment as failed`
        : null,
  };
}
