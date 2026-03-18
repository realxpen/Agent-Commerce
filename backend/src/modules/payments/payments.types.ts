import type {
  PaymentConfirmationStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

export const paymentDtoSelect = {
  id: true,
  orderId: true,
  agentId: true,
  chainId: true,
  paymentReference: true,
  txHash: true,
  amount: true,
  feeAmount: true,
  currency: true,
  denom: true,
  payerAddress: true,
  recipientAddress: true,
  status: true,
  confirmationStatus: true,
  confirmationCount: true,
  blockHeight: true,
  confirmedAt: true,
  finalizedAt: true,
  failureReason: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      serviceTitleSnapshot: true,
      paymentReference: true,
      txHash: true,
      customerId: true,
    },
  },
  agent: {
    select: {
      id: true,
      ownerId: true,
      name: true,
      slug: true,
      treasuryAddress: true,
    },
  },
} satisfies Prisma.PaymentSelect;

export type PaymentRecord = Prisma.PaymentGetPayload<{
  select: typeof paymentDtoSelect;
}>;

export type PaymentDto = {
  id: string;
  orderId: string;
  agentId: string;
  chainId: string;
  paymentReference: string | null;
  txHash: string | null;
  amount: string;
  feeAmount: string;
  currency: string | null;
  denom: string;
  sender: string;
  recipient: string;
  status: PaymentStatus;
  confirmationStatus: PaymentConfirmationStatus;
  confirmationCount: number;
  blockHeight: string | null;
  confirmedAt: string | null;
  finalizedAt: string | null;
  failureReason: string | null;
  order: {
    id: string;
    customerId: string;
    status: string;
    paymentStatus: string;
    serviceTitle: string;
    paymentReference: string | null;
    txHash: string | null;
  };
  agent: {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    treasuryAddress: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type PaymentListDto = {
  data: PaymentDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
