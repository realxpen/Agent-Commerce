import type { AgentPricingModel, AgentServiceStatus, Prisma } from "@prisma/client";

export const agentServiceDtoSelect = {
  id: true,
  agentId: true,
  slug: true,
  title: true,
  description: true,
  status: true,
  priceAmount: true,
  priceCurrency: true,
  priceDenom: true,
  estimatedDeliveryMinutes: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  agent: {
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      pricingModel: true,
      treasuryAddress: true,
    },
  },
} satisfies Prisma.AgentServiceSelect;

export type AgentServiceRecord = Prisma.AgentServiceGetPayload<{
  select: typeof agentServiceDtoSelect;
}>;

export type AgentServiceDto = {
  id: string;
  agentId: string;
  slug: string;
  title: string;
  description: string | null;
  status: AgentServiceStatus;
  pricing: {
    amount: string;
    currency: string | null;
    denom: string;
  };
  estimatedDeliveryMinutes: number | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  agent?: {
    id: string;
    name: string;
    slug: string;
    category: string;
    pricingModel: AgentPricingModel;
    treasuryAddress: string;
  };
};

export type AgentServiceListDto = {
  data: AgentServiceDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
