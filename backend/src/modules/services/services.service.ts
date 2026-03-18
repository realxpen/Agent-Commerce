import { AgentServiceStatus, AgentStatus, Prisma, type PrismaClient } from "@prisma/client";

import { createHttpError } from "../../utils/http-error.js";
import { slugify } from "../../utils/slug.js";
import type {
  CreateServiceBody,
  ListServicesQuery,
  UpdateServiceBody,
} from "./services.schemas.js";
import {
  agentServiceDtoSelect,
  type AgentServiceDto,
  type AgentServiceListDto,
  type AgentServiceRecord,
} from "./services.types.js";

type ServiceDb = PrismaClient | Prisma.TransactionClient;

type CreateServiceInput = CreateServiceBody & {
  agentId: string;
};

function toAgentServiceDto(service: AgentServiceRecord): AgentServiceDto {
  return {
    id: service.id,
    agentId: service.agentId,
    slug: service.slug,
    title: service.title,
    description: service.description,
    status: service.status,
    pricing: {
      amount: service.priceAmount.toString(),
      currency: service.priceCurrency,
      denom: service.priceDenom,
    },
    estimatedDeliveryMinutes: service.estimatedDeliveryMinutes,
    metadata: service.metadata,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
    agent: service.agent
      ? {
          id: service.agent.id,
          name: service.agent.name,
          slug: service.agent.slug,
          category: service.agent.category,
          pricingModel: service.agent.pricingModel,
          treasuryAddress: service.agent.treasuryAddress,
        }
      : undefined,
  };
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

async function findAgentOrThrow(db: ServiceDb, agentId: string) {
  const agent = await db.agent.findUnique({
    where: {
      id: agentId,
    },
    select: {
      id: true,
      status: true,
      ownerId: true,
    },
  });

  if (!agent) {
    throw createHttpError(404, "Agent not found");
  }

  return agent;
}

async function findServiceOrThrow(db: ServiceDb, serviceId: string) {
  const service = await db.agentService.findUnique({
    where: {
      id: serviceId,
    },
    select: agentServiceDtoSelect,
  });

  if (!service) {
    throw createHttpError(404, "Service not found");
  }

  return service;
}

async function generateUniqueServiceSlug(db: ServiceDb, agentId: string, title: string) {
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

export async function createService(
  db: ServiceDb,
  input: CreateServiceInput,
): Promise<AgentServiceDto> {
  const agent = await findAgentOrThrow(db, input.agentId);

  if (agent.status === AgentStatus.ARCHIVED) {
    throw createHttpError(409, "Archived agents cannot accept new services");
  }

  const slug = await generateUniqueServiceSlug(db, input.agentId, input.title);

  const service = await db.agentService.create({
    data: {
      agentId: input.agentId,
      slug,
      title: input.title.trim(),
      description: input.description.trim(),
      status: AgentServiceStatus.DRAFT,
      priceAmount: input.priceAmount,
      priceCurrency: normalizeOptionalString(input.priceCurrency),
      priceDenom: input.priceDenom.trim(),
      estimatedDeliveryMinutes: input.estimatedDeliveryMinutes ?? null,
      metadata: toNullableJsonInput(input.metadata),
    },
    select: {
      id: true,
    },
  });

  return getServiceById(db, service.id);
}

export async function updateService(
  db: ServiceDb,
  serviceId: string,
  input: UpdateServiceBody,
): Promise<AgentServiceDto> {
  const existingService = await findServiceOrThrow(db, serviceId);

  if (existingService.status === AgentServiceStatus.ARCHIVED) {
    throw createHttpError(409, "Archived services cannot be updated");
  }

  const data: Prisma.AgentServiceUpdateInput = {};

  if (input.title !== undefined) {
    data.title = input.title.trim();
  }

  if (input.description !== undefined) {
    data.description = input.description.trim();
  }

  if (input.priceAmount !== undefined) {
    data.priceAmount = input.priceAmount;
  }

  if (input.priceCurrency !== undefined) {
    data.priceCurrency = normalizeOptionalString(input.priceCurrency);
  }

  if (input.priceDenom !== undefined) {
    data.priceDenom = input.priceDenom.trim();
  }

  if (input.estimatedDeliveryMinutes !== undefined) {
    data.estimatedDeliveryMinutes = input.estimatedDeliveryMinutes;
  }

  if (input.metadata !== undefined) {
    data.metadata = toNullableJsonInput(input.metadata);
  }

  const updatedService = await db.agentService.update({
    where: {
      id: serviceId,
    },
    data,
    select: {
      id: true,
    },
  });

  return getServiceById(db, updatedService.id);
}

export async function publishService(
  db: ServiceDb,
  serviceId: string,
): Promise<AgentServiceDto> {
  const existingService = await findServiceOrThrow(db, serviceId);
  const agent = await findAgentOrThrow(db, existingService.agentId);

  if (agent.status !== AgentStatus.ACTIVE) {
    throw createHttpError(409, "Publish the agent before publishing services");
  }

  if (existingService.status === AgentServiceStatus.ACTIVE) {
    return toAgentServiceDto(existingService);
  }

  if (existingService.status === AgentServiceStatus.ARCHIVED) {
    throw createHttpError(409, "Archived services cannot be published");
  }

  const publishedService = await db.agentService.update({
    where: {
      id: serviceId,
    },
    data: {
      status: AgentServiceStatus.ACTIVE,
    },
    select: agentServiceDtoSelect,
  });

  return toAgentServiceDto(publishedService);
}

export async function getServiceById(
  db: ServiceDb,
  serviceId: string,
): Promise<AgentServiceDto> {
  const service = await findServiceOrThrow(db, serviceId);
  return toAgentServiceDto(service);
}

export async function listServices(
  db: ServiceDb,
  query: ListServicesQuery,
): Promise<AgentServiceListDto> {
  const where: Prisma.AgentServiceWhereInput = {
    agentId: query.agentId,
    status: query.status,
    agent: query.ownerId
      ? {
          ownerId: query.ownerId,
        }
      : undefined,
  };
  const skip = (query.page - 1) * query.pageSize;

  const [services, totalItems] = await Promise.all([
    db.agentService.findMany({
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
      select: agentServiceDtoSelect,
    }),
    db.agentService.count({ where }),
  ]);

  return {
    data: services.map(toAgentServiceDto),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
    },
  };
}
