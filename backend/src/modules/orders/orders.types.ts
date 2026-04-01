import type {
  DeliveryStatus,
  OrderPaymentStatus,
  OrderStatus,
  Prisma,
} from "@prisma/client";

export const orderDtoSelect = {
  id: true,
  customerId: true,
  agentId: true,
  agentServiceId: true,
  status: true,
  paymentStatus: true,
  deliveryStatus: true,
  serviceTitleSnapshot: true,
  serviceSnapshot: true,
  quantity: true,
  quotedPriceAmount: true,
  finalPaidAmount: true,
  currency: true,
  denom: true,
  customerNote: true,
  customerReferences: true,
  revisionRequests: true,
  deliveryVersions: true,
  deliveryUrl: true,
  deliveryText: true,
  onchainOrderId: true,
  paymentReference: true,
  txHash: true,
  expectedPaymentInfo: true,
  paidAt: true,
  deliveredAt: true,
  completedAt: true,
  cancelledAt: true,
  failedAt: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      displayName: true,
      email: true,
    },
  },
  agent: {
    select: {
      id: true,
      ownerId: true,
      name: true,
      slug: true,
      category: true,
      treasuryAddress: true,
    },
  },
  service: {
    select: {
      id: true,
      slug: true,
      title: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderRecord = Prisma.OrderGetPayload<{
  select: typeof orderDtoSelect;
}>;

export type OrderDto = {
  id: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  deliveryStatus: DeliveryStatus;
  customerId: string;
  customer: {
    id: string;
    displayName: string | null;
    email: string | null;
  };
  agent: {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    category: string;
    treasuryAddress: string;
  };
  service: {
    id: string;
    slug: string;
    title: string;
    snapshot: unknown;
  };
  pricing: {
    quotedPrice: string;
    finalPaidAmount: string | null;
    currency: string | null;
    denom: string;
    quantity: number;
  };
  onchainOrderId: string | null;
  customerNote: string | null;
  customerReferences: Array<{
    type: "image" | "video" | "audio" | "document" | "link";
    label: string;
    url: string;
    note: string | null;
    source: "link" | "upload";
    uploadId: string | null;
    fileName: string | null;
    contentType: string | null;
    sizeBytes: number | null;
    previewText: string | null;
  }>;
  revisionRequests: Array<{
    id: string;
    requestedByUserId: string;
    note: string;
    status: "OPEN" | "ADDRESSING" | "ADDRESSED" | "FAILED";
    requestedAt: string;
    updatedAt: string;
    resolvedAt: string | null;
    failureReason: string | null;
  }>;
  deliveryVersions: Array<{
    id: string;
    versionNumber: number;
    source: "ai_task" | "owner_publish";
    revisionRequestId: string | null;
    taskRunId: string | null;
    publishedByUserId: string | null;
    deliveryUrl: string | null;
    deliveryText: string | null;
    createdAt: string;
  }>;
  payment: {
    reference: string | null;
    txHash: string | null;
    expectedInfo: unknown;
    paidAt: string | null;
  };
  delivery: {
    url: string | null;
    text: string | null;
    deliveredAt: string | null;
    completedAt: string | null;
  };
  failedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderListDto = {
  data: OrderDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
