import { AgentStatus, Prisma } from "@prisma/client";

import type { CreateAgentBody, ListAgentsQuery, UpdateAgentBody } from "./agents.schemas.js";
import { createHttpError } from "../../utils/http-error.js";
import { slugify } from "../../utils/slug.js";
import { agentDtoSelect, type AgentDb, type AgentDto, type AgentListDto, type AgentRecord } from "./agents.types.js";

type CreateAgentInput = CreateAgentBody & {
  ownerId: string;
};

function normalizeOptionalString(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableJsonInput(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function toAgentDto(agent: AgentRecord): AgentDto {
  return {
    id: agent.id,
    ownerId: agent.ownerId,
    name: agent.name,
    slug: agent.slug,
    category: agent.category,
    description: agent.description,
    pricingModel: agent.pricingModel,
    appchainId: agent.appchainId,
    contractAddress: agent.contractAddress,
    treasuryAddress: agent.treasuryAddress,
    status: agent.status,
    initUsername: agent.initUsername,
    metadata: agent.metadata,
    serviceCount: agent._count.services,
    orderCount: agent._count.orders,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

async function generateUniqueSlug(db: AgentDb, name: string) {
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

async function findAgentOrThrow(db: AgentDb, agentId: string) {
  const agent = await db.agent.findUnique({
    where: {
      id: agentId,
    },
    select: agentDtoSelect,
  });

  if (!agent) {
    throw createHttpError(404, "Agent not found");
  }

  return agent;
}

export async function createAgent(db: AgentDb, input: CreateAgentInput): Promise<AgentDto> {
  const slug = await generateUniqueSlug(db, input.name);

  const agent = await db.agent.create({
    data: {
      ownerId: input.ownerId,
      name: input.name.trim(),
      slug,
      category: input.category.trim(),
      description: input.description.trim(),
      pricingModel: input.pricingModel,
      appchainId: normalizeOptionalString(input.appchainId),
      contractAddress: normalizeOptionalString(input.contractAddress),
      treasuryAddress: input.treasuryAddress.trim(),
      initUsername: normalizeOptionalString(input.initUsername),
      metadata: toNullableJsonInput(input.metadata),
      status: AgentStatus.DRAFT,
    },
    select: {
      id: true,
    },
  });

  return getAgentById(db, agent.id);
}

export async function updateAgent(
  db: AgentDb,
  agentId: string,
  input: UpdateAgentBody,
): Promise<AgentDto> {
  const existingAgent = await findAgentOrThrow(db, agentId);

  if (existingAgent.status === AgentStatus.ARCHIVED) {
    throw createHttpError(409, "Archived agents cannot be updated");
  }

  const data: Prisma.AgentUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name.trim();
  }

  if (input.category !== undefined) {
    data.category = input.category.trim();
  }

  if (input.description !== undefined) {
    data.description = input.description.trim();
  }

  if (input.pricingModel !== undefined) {
    data.pricingModel = input.pricingModel;
  }

  if (input.treasuryAddress !== undefined) {
    data.treasuryAddress = input.treasuryAddress.trim();
  }

  if (input.initUsername !== undefined) {
    data.initUsername = normalizeOptionalString(input.initUsername);
  }

  if (input.appchainId !== undefined) {
    data.appchainId = normalizeOptionalString(input.appchainId);
  }

  if (input.contractAddress !== undefined) {
    data.contractAddress = normalizeOptionalString(input.contractAddress);
  }

  if (input.metadata !== undefined) {
    data.metadata = toNullableJsonInput(input.metadata);
  }

  const updatedAgent = await db.agent.update({
    where: {
      id: agentId,
    },
    data,
    select: {
      id: true,
    },
  });

  return getAgentById(db, updatedAgent.id);
}

export async function listAgents(db: AgentDb, query: ListAgentsQuery): Promise<AgentListDto> {
  const where: Prisma.AgentWhereInput = {
    ownerId: query.ownerId,
    status: query.status,
    pricingModel: query.pricingModel,
    category: query.category
      ? {
          equals: query.category,
          mode: "insensitive",
        }
      : undefined,
  };

  const skip = (query.page - 1) * query.pageSize;

  const [agents, totalItems] = await Promise.all([
    db.agent.findMany({
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
      select: agentDtoSelect,
    }),
    db.agent.count({ where }),
  ]);

  return {
    data: agents.map(toAgentDto),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
    },
  };
}

export async function getAgentById(db: AgentDb, agentId: string): Promise<AgentDto> {
  const agent = await findAgentOrThrow(db, agentId);
  return toAgentDto(agent);
}

export async function publishAgent(db: AgentDb, agentId: string): Promise<AgentDto> {
  const existingAgent = await findAgentOrThrow(db, agentId);

  if (existingAgent.status === AgentStatus.ARCHIVED) {
    throw createHttpError(409, "Archived agents cannot be published");
  }

  if (existingAgent.status === AgentStatus.ACTIVE) {
    return toAgentDto(existingAgent);
  }

  const publishedAgent = await db.agent.update({
    where: {
      id: agentId,
    },
    data: {
      status: AgentStatus.ACTIVE,
    },
    select: agentDtoSelect,
  });

  return toAgentDto(publishedAgent);
}

export async function archiveAgent(db: AgentDb, agentId: string): Promise<AgentDto> {
  const existingAgent = await findAgentOrThrow(db, agentId);

  if (existingAgent.status === AgentStatus.ARCHIVED) {
    return toAgentDto(existingAgent);
  }

  const archivedAgent = await db.agent.update({
    where: {
      id: agentId,
    },
    data: {
      status: AgentStatus.ARCHIVED,
    },
    select: agentDtoSelect,
  });

  return toAgentDto(archivedAgent);
}
