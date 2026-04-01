import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  type Log,
  type PublicClient,
} from "viem";
import type { ContractType, Prisma } from "@prisma/client";

import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { agentRegistryEventAbi } from "./indexer/agent-registry-events.js";
import { serviceEscrowEventAbi } from "./indexer/service-escrow-events.js";
import { logger } from "./lib/logger.js";
import { closeQueues, createQueues } from "./queues/index.js";
import { ingestContractEvent } from "./modules/contract-events/contract-events.service.js";
import { registerShutdownHooks } from "./utils/shutdown.js";

type IndexedContract = {
  label: string;
  contractType: ContractType;
  address: `0x${string}`;
  abi: readonly unknown[];
  buildParsedPayload: (
    eventName: string,
    args: Record<string, unknown>,
  ) => Prisma.InputJsonObject;
};

type PollerContext = {
  client: PublicClient;
  chainId: string;
  contracts: IndexedContract[];
};

const chainOrderStatusByValue = {
  0: "PENDING_PAYMENT",
  1: "PAID",
  2: "IN_PROGRESS",
  3: "DELIVERED",
  4: "COMPLETED",
  5: "CANCELLED",
  6: "REFUNDED",
  7: "DISPUTED",
} as const;

function serializeJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeJsonValue(entry));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(record)) {
      if (entry !== undefined) {
        result[key] = serializeJsonValue(entry);
      }
    }

    return result;
  }

  return String(value);
}

function toNumericString(value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value).toString();
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function toAddressString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function toBooleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function toOrderStatus(value: unknown) {
  const numeric = Number(toNumericString(value));

  if (!Number.isInteger(numeric)) {
    return null;
  }

  return chainOrderStatusByValue[numeric as keyof typeof chainOrderStatusByValue] ?? null;
}

function buildServiceEscrowParsedPayload(
  eventName: string,
  args: Record<string, unknown>,
): Prisma.InputJsonObject {
  switch (eventName) {
    case "OrderCreated":
      return {
        onchainOrderId: toNumericString(args.orderId),
        onchainAgentId: toNumericString(args.agentId),
        onchainServiceId: toNumericString(args.serviceId),
        customer: toAddressString(args.customer),
        sender: toAddressString(args.customer),
        amount: toNumericString(args.amountPaid),
        platformFeeAmount: toNumericString(args.platformFeeAmount),
        agentPayoutAmount: toNumericString(args.agentPayoutAmount),
        newStatus: toOrderStatus(args.status),
        subscriptionId: toNumericString(args.subscriptionId),
      } satisfies Prisma.InputJsonObject;
    case "OrderStatusChanged":
      return {
        onchainOrderId: toNumericString(args.orderId),
        onchainAgentId: toNumericString(args.agentId),
        actor: toAddressString(args.actor),
        previousStatus: toOrderStatus(args.previousStatus),
        newStatus: toOrderStatus(args.newStatus),
      } satisfies Prisma.InputJsonObject;
    case "DeliverySubmitted":
      return {
        onchainOrderId: toNumericString(args.orderId),
        onchainAgentId: toNumericString(args.agentId),
        actor: toAddressString(args.actor),
        deliveryRef: toOptionalString(args.deliveryRef),
      } satisfies Prisma.InputJsonObject;
    case "FundsReleased":
      return {
        onchainOrderId: toNumericString(args.orderId),
        onchainAgentId: toNumericString(args.agentId),
        agentTreasury: toAddressString(args.agentTreasury),
        customer: toAddressString(args.customer),
        feeTreasury: toAddressString(args.feeTreasury),
        platformFeeAmount: toNumericString(args.platformFeeAmount),
        agentPayoutAmount: toNumericString(args.agentPayoutAmount),
        newStatus: "COMPLETED",
      } satisfies Prisma.InputJsonObject;
    case "Refunded":
      return {
        onchainOrderId: toNumericString(args.orderId),
        onchainAgentId: toNumericString(args.agentId),
        customer: toAddressString(args.customer),
        actor: toAddressString(args.actor),
        amountRefunded: toNumericString(args.amountRefunded),
        previousStatus: toOrderStatus(args.previousStatus),
        newStatus: "REFUNDED",
      } satisfies Prisma.InputJsonObject;
    default:
      return serializeJsonValue(args) as Prisma.InputJsonObject;
  }
}

function buildAgentRegistryParsedPayload(
  eventName: string,
  args: Record<string, unknown>,
): Prisma.InputJsonObject {
  switch (eventName) {
    case "AgentCreated":
      return {
        onchainAgentId: toNumericString(args.agentId),
        owner: toAddressString(args.owner),
        sender: toAddressString(args.owner),
        treasury: toAddressString(args.treasury),
        name: toOptionalString(args.name),
        category: toOptionalString(args.category),
        description: toOptionalString(args.description),
        initUsername: toOptionalString(args.initUsername),
        active: toBooleanValue(args.active),
      } satisfies Prisma.InputJsonObject;
    case "ServiceCreated":
      return {
        onchainServiceId: toNumericString(args.serviceId),
        onchainAgentId: toNumericString(args.agentId),
        owner: toAddressString(args.owner),
        sender: toAddressString(args.owner),
        title: toOptionalString(args.title),
        description: toOptionalString(args.description),
        price: toNumericString(args.price),
        serviceType: toNumericString(args.serviceType),
        billingInterval: toNumericString(args.billingInterval),
        recurringPrice: toNumericString(args.recurringPrice),
        active: toBooleanValue(args.active),
      } satisfies Prisma.InputJsonObject;
    default:
      return serializeJsonValue(args) as Prisma.InputJsonObject;
  }
}

async function getBlockTimestamp(
  client: PublicClient,
  blockNumber: bigint,
  cache: Map<bigint, Date | null>,
) {
  if (cache.has(blockNumber)) {
    return cache.get(blockNumber) ?? null;
  }

  const block = await client.getBlock({
    blockNumber,
  });

  const timestamp = new Date(Number(block.timestamp) * 1000);
  cache.set(blockNumber, timestamp);
  return timestamp;
}

async function resolveInitialCursor(
  client: PublicClient,
  contractAddress: `0x${string}`,
) {
  if (env.INDEXER_START_BLOCK) {
    const startBlock = BigInt(env.INDEXER_START_BLOCK);
    return startBlock > 0n ? startBlock - 1n : 0n;
  }

  const latestProcessed = await prisma.contractEvent.aggregate({
    where: {
      contractAddress,
    },
    _max: {
      blockHeight: true,
    },
  });

  if (latestProcessed._max.blockHeight !== null) {
    return latestProcessed._max.blockHeight;
  }

  const latestBlock = await client.getBlockNumber();
  const lookbackBlocks = BigInt(env.INDEXER_LOOKBACK_BLOCKS);
  return latestBlock > lookbackBlocks ? latestBlock - lookbackBlocks : 0n;
}

async function processLog(
  context: PollerContext,
  contract: IndexedContract,
  log: Log,
  blockTimestampCache: Map<bigint, Date | null>,
  queues: ReturnType<typeof createQueues>,
) {
  if (!log.blockNumber || !log.transactionHash) {
    logger.warn(
      { contract: contract.label, log },
      "Skipping indexed contract log without block number or transaction hash",
    );
    return;
  }

  let decoded: {
    eventName: string;
    args: Record<string, unknown>;
  } | null = null;

  try {
    const rawDecoded = decodeEventLog({
      abi: contract.abi,
      data: log.data,
      topics: log.topics,
    }) as unknown;

    const decodedRecord = rawDecoded as {
      eventName: string;
      args: readonly unknown[] | Record<string, unknown>;
    };

    decoded = {
      eventName: decodedRecord.eventName,
      args: Array.isArray(decodedRecord.args)
        ? {}
        : (decodedRecord.args as Record<string, unknown>),
    };
  } catch (error) {
    logger.warn(
      {
        contract: contract.label,
        err: error,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
      },
      "Skipping undecodable indexed contract log",
    );
    return;
  }

  if (!decoded) {
    return;
  }

  const argsRecord = decoded.args;
  const blockTimestamp = await getBlockTimestamp(
    context.client,
    log.blockNumber,
    blockTimestampCache,
  );

  const result = await ingestContractEvent(prisma, queues, {
    chainId: context.chainId,
    contractType: contract.contractType,
    contractAddress: contract.address,
    txHash: log.transactionHash,
    blockHeight: log.blockNumber,
    blockTimestamp: blockTimestamp ?? undefined,
    eventName: decoded.eventName,
    eventIndex: log.logIndex ?? 0,
    rawPayload: {
      eventName: decoded.eventName,
      args: serializeJsonValue(argsRecord) as Prisma.InputJsonObject,
      transactionIndex:
        typeof log.transactionIndex === "number" ? log.transactionIndex : null,
      blockHash: log.blockHash ?? null,
    },
    parsedPayload: contract.buildParsedPayload(decoded.eventName, argsRecord),
  });

  logger.debug(
    {
      contract: contract.label,
      eventName: decoded.eventName,
      txHash: log.transactionHash,
      blockHeight: log.blockNumber.toString(),
      duplicate: result.meta.duplicate,
      processed: result.meta.processed,
      contractEventId: result.data.id,
    },
    "Indexed contract event",
  );
}

async function start() {
  if (!env.INDEXER_EVM_RPC_URL) {
    throw new Error(
      "INDEXER_EVM_RPC_URL is required for the real on-chain indexer. Set it directly or via NEXT_PUBLIC_APPCHAIN_RPC_URL.",
    );
  }

  const contracts: IndexedContract[] = [];

  if (env.AGENT_REGISTRY_CONTRACT_ADDRESS) {
    contracts.push({
      label: "AgentRegistry",
      contractType: "AGENT_REGISTRY",
      address: getAddress(env.AGENT_REGISTRY_CONTRACT_ADDRESS),
      abi: agentRegistryEventAbi,
      buildParsedPayload: buildAgentRegistryParsedPayload,
    });
  }

  if (env.SERVICE_ESCROW_CONTRACT_ADDRESS) {
    contracts.push({
      label: "ServiceEscrow",
      contractType: "SERVICE_ESCROW",
      address: getAddress(env.SERVICE_ESCROW_CONTRACT_ADDRESS),
      abi: serviceEscrowEventAbi,
      buildParsedPayload: buildServiceEscrowParsedPayload,
    });
  }

  if (contracts.length === 0) {
    throw new Error(
      "Configure AGENT_REGISTRY_CONTRACT_ADDRESS and/or SERVICE_ESCROW_CONTRACT_ADDRESS before starting the real on-chain indexer.",
    );
  }

  const client = createPublicClient({
    transport: http(env.INDEXER_EVM_RPC_URL, {
      timeout: 15_000,
    }),
  });

  await prisma.$connect();
  const queues = createQueues();

  const chainId = env.INDEXER_CHAIN_ID ?? String(await client.getChainId());
  const context: PollerContext = {
    client,
    chainId,
    contracts,
  };

  const cursors = new Map<string, bigint>();
  for (const contract of contracts) {
    cursors.set(
      contract.address,
      await resolveInitialCursor(client, contract.address),
    );
  }

  let isPolling = false;
  let isShuttingDown = false;

  async function pollContract(
    contract: IndexedContract,
    targetBlock: bigint,
  ) {
    let cursor = cursors.get(contract.address) ?? 0n;
    if (targetBlock <= cursor) {
      return;
    }

    let fromBlock = cursor + 1n;
    const batchSpan = BigInt(env.INDEXER_BATCH_SIZE);

    while (fromBlock <= targetBlock && !isShuttingDown) {
      const batchFromBlock = fromBlock;
      const toBlock =
        fromBlock + batchSpan - 1n <= targetBlock
          ? fromBlock + batchSpan - 1n
          : targetBlock;

      const logs = await client.getLogs({
        address: contract.address,
        fromBlock,
        toBlock,
      });

      const blockTimestampCache = new Map<bigint, Date | null>();

      for (const log of logs) {
        await processLog(context, contract, log, blockTimestampCache, queues);
      }

      cursor = toBlock;
      cursors.set(contract.address, cursor);
      fromBlock = toBlock + 1n;

      logger.info(
        {
          contract: contract.label,
          contractAddress: contract.address,
          processedRangeStart: batchFromBlock.toString(),
          processedRangeEnd: toBlock.toString(),
          processedLogCount: logs.length,
        },
        "Indexed contract block range",
      );
    }
  }

  async function pollOnce() {
    if (isPolling || isShuttingDown) {
      return;
    }

    isPolling = true;

    try {
      const latestBlock = await client.getBlockNumber();
      const confirmationDepth = BigInt(env.INDEXER_CONFIRMATIONS);
      const targetBlock =
        latestBlock > confirmationDepth ? latestBlock - confirmationDepth : 0n;

      for (const contract of contracts) {
        await pollContract(contract, targetBlock);
      }
    } catch (error) {
      logger.error({ err: error }, "Indexer poll cycle failed");
    } finally {
      isPolling = false;
    }
  }

  const timer = setInterval(() => {
    void pollOnce();
  }, env.INDEXER_POLL_INTERVAL_MS);

  logger.info(
    {
      rpcUrl: env.INDEXER_EVM_RPC_URL,
      chainId,
      contracts: contracts.map((contract) => ({
        label: contract.label,
        address: contract.address,
        startCursor: (cursors.get(contract.address) ?? 0n).toString(),
      })),
      pollIntervalMs: env.INDEXER_POLL_INTERVAL_MS,
      confirmations: env.INDEXER_CONFIRMATIONS,
      batchSize: env.INDEXER_BATCH_SIZE,
    },
    "Real on-chain indexer started",
  );

  registerShutdownHooks({
    name: "indexer",
    log: logger,
    close: async () => {
      isShuttingDown = true;
      clearInterval(timer);
      await closeQueues(queues);
      await prisma.$disconnect();
    },
  });

  await pollOnce();
}

void start().catch((error) => {
  logger.error({ err: error }, "Failed to start real on-chain indexer");
  process.exit(1);
});
