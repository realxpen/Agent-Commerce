import type { ContractEventStatus, ContractType, Prisma } from "@prisma/client";

export const contractEventDtoSelect = {
  id: true,
  eventKey: true,
  chainId: true,
  contractType: true,
  contractAddress: true,
  txHash: true,
  blockHeight: true,
  blockTimestamp: true,
  eventName: true,
  eventIndex: true,
  status: true,
  rawPayload: true,
  parsedPayload: true,
  agentId: true,
  orderId: true,
  paymentId: true,
  processingAttempts: true,
  processedAt: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ContractEventSelect;

export type ContractEventRecord = Prisma.ContractEventGetPayload<{
  select: typeof contractEventDtoSelect;
}>;

export type ContractEventDto = {
  id: string;
  eventKey: string;
  chainId: string;
  contractType: ContractType;
  contractAddress: string;
  txHash: string;
  blockHeight: string;
  blockTimestamp: string | null;
  eventName: string;
  eventIndex: number | null;
  status: ContractEventStatus;
  rawPayload: unknown | null;
  parsedPayload: unknown;
  agentId: string | null;
  orderId: string | null;
  paymentId: string | null;
  processingAttempts: number;
  processedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractEventIngestResultDto = {
  data: ContractEventDto;
  meta: {
    duplicate: boolean;
    processed: boolean;
  };
};
