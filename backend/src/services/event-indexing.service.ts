import { PaymentStatus, Prisma, type PrismaClient } from "@prisma/client";

import { logger } from "../lib/logger.js";
import { createHttpError } from "../utils/http-error.js";
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
  findOrderByPaymentReference,
  findOrderForPaymentCreate,
  findPaymentForEventMatch,
  syncOrderFromPaymentStatus,
  updatePaymentRecord,
} from "../modules/payments/payments.repository.js";
import type { PaymentRecord } from "../modules/payments/payments.types.js";

async function applyPaymentMutation(
  db: Prisma.TransactionClient,
  event: NormalizedContractEvent,
): Promise<PaymentRecord | null> {
  const mutation = mapContractEventToPaymentMutation(event);

  if (!mutation) {
    return null;
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

    return updatedPayment;
  }

  const matchedOrder =
    (mutation.orderId ? await findOrderForPaymentCreate(db, mutation.orderId) : null) ??
    (mutation.paymentReference
      ? await findOrderByPaymentReference(db, mutation.paymentReference)
      : null);

  if (!matchedOrder) {
    throw createHttpError(422, "Chain event could not be matched to an order");
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

  return createdPayment;
}

export async function indexContractEvent(
  db: PrismaClient,
  event: NormalizedContractEvent,
): Promise<{
  contractEvent: ContractEventRecord;
  duplicate: boolean;
  processed: boolean;
  paymentOrderId: string | null;
  paymentStatus: PaymentStatus | null;
}> {
  const seededEvent = await upsertContractEventSeed(db, event);

  if (seededEvent.status === "PROCESSED") {
    return {
      contractEvent: seededEvent,
      duplicate: true,
      processed: true,
      paymentOrderId: null,
      paymentStatus: null,
    };
  }

  try {
    const processed = await db.$transaction(async (tx) => {
      const currentEvent = await upsertContractEventSeed(tx, event);

      if (currentEvent.status === "PROCESSED") {
        return {
          contractEvent: currentEvent,
          paymentOrderId: null,
          paymentStatus: null,
        };
      }

      const processingEvent = await incrementContractEventProcessingAttempt(tx, currentEvent.id);
      const payment = await applyPaymentMutation(tx, event);

      if (payment) {
        await recomputeDailyTreasurySnapshot(tx, {
          agentId: payment.agentId,
          denom: payment.denom,
          currency: payment.currency,
          referenceTime: event.blockTimestamp ?? new Date(),
        });
      }

      const contractEvent = await markContractEventProcessed(tx, processingEvent.id, {
        agentId: payment?.agentId ?? currentEvent.agentId,
        orderId: payment?.orderId ?? currentEvent.orderId,
        paymentId: payment?.id ?? currentEvent.paymentId,
      });

      return {
        contractEvent,
        paymentOrderId: payment?.orderId ?? null,
        paymentStatus: payment?.status ?? null,
      };
    });

    return {
      contractEvent: processed.contractEvent,
      duplicate: false,
      processed: true,
      paymentOrderId: processed.paymentOrderId,
      paymentStatus: processed.paymentStatus,
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
      paymentOrderId: null,
      paymentStatus: null,
    };
  }
}
