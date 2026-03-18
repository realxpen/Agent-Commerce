import type { AgentPricingModel, AgentStatus, Prisma, PrismaClient } from "@prisma/client";

export type AgentDb = Pick<PrismaClient, "agent">;

export const agentDtoSelect = {
  id: true,
  ownerId: true,
  name: true,
  slug: true,
  category: true,
  description: true,
  pricingModel: true,
  appchainId: true,
  contractAddress: true,
  treasuryAddress: true,
  status: true,
  initUsername: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      services: true,
      orders: true,
    },
  },
} satisfies Prisma.AgentSelect;

export type AgentRecord = Prisma.AgentGetPayload<{
  select: typeof agentDtoSelect;
}>;

export type AgentDto = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  pricingModel: AgentPricingModel;
  appchainId: string | null;
  contractAddress: string | null;
  treasuryAddress: string;
  status: AgentStatus;
  initUsername: string | null;
  metadata: Prisma.JsonValue | null;
  serviceCount: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentListDto = {
  data: AgentDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
