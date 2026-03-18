import type { PrismaClient } from "@prisma/client";

import type { AppQueues } from "../../queues/index.js";
import { maybeTriggerTaskProcessingForOrder } from "../ai-tasks/task.service.js";
import { indexContractEvent } from "../../services/event-indexing.service.js";
import { parseContractEventInput } from "./contract-events.parser.js";
import type { IngestContractEventBody } from "./contract-events.schemas.js";
import {
  findContractEventOrThrow,
} from "./contract-events.repository.js";
import type {
  ContractEventDto,
  ContractEventIngestResultDto,
  ContractEventRecord,
} from "./contract-events.types.js";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toContractEventDto(contractEvent: ContractEventRecord): ContractEventDto {
  return {
    id: contractEvent.id,
    eventKey: contractEvent.eventKey,
    chainId: contractEvent.chainId,
    contractType: contractEvent.contractType,
    contractAddress: contractEvent.contractAddress,
    txHash: contractEvent.txHash,
    blockHeight: contractEvent.blockHeight.toString(),
    blockTimestamp: toIsoString(contractEvent.blockTimestamp),
    eventName: contractEvent.eventName,
    eventIndex: contractEvent.eventIndex,
    status: contractEvent.status,
    rawPayload: contractEvent.rawPayload,
    parsedPayload: contractEvent.parsedPayload,
    agentId: contractEvent.agentId,
    orderId: contractEvent.orderId,
    paymentId: contractEvent.paymentId,
    processingAttempts: contractEvent.processingAttempts,
    processedAt: toIsoString(contractEvent.processedAt),
    errorMessage: contractEvent.errorMessage,
    createdAt: contractEvent.createdAt.toISOString(),
    updatedAt: contractEvent.updatedAt.toISOString(),
  };
}

export async function ingestContractEvent(
  db: PrismaClient,
  queues: AppQueues,
  input: IngestContractEventBody,
): Promise<ContractEventIngestResultDto> {
  const parsedEvent = parseContractEventInput(input);
  const result = await indexContractEvent(db, parsedEvent);

  if (result.processed && result.paymentStatus === "CONFIRMED" && result.paymentOrderId) {
    await maybeTriggerTaskProcessingForOrder(db, queues, {
      orderId: result.paymentOrderId,
      source: "contract-event",
    });
  }

  return {
    data: toContractEventDto(result.contractEvent),
    meta: {
      duplicate: result.duplicate,
      processed: result.processed,
    },
  };
}

export async function getContractEventById(
  db: PrismaClient,
  contractEventId: string,
): Promise<ContractEventDto> {
  const contractEvent = await findContractEventOrThrow(db, contractEventId);
  return toContractEventDto(contractEvent);
}
