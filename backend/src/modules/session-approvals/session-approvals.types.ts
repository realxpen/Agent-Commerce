import type { Prisma, SessionApprovalStatus, SessionApprovalType } from "@prisma/client";

export const sessionApprovalSelect = {
  id: true,
  userId: true,
  walletId: true,
  agentId: true,
  chainId: true,
  approvalType: true,
  status: true,
  approvalKey: true,
  sessionPublicKey: true,
  scope: true,
  metadata: true,
  approvedAt: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  wallet: {
    select: {
      id: true,
      address: true,
      label: true,
    },
  },
} satisfies Prisma.SessionApprovalSelect;

export type SessionApprovalRecord = Prisma.SessionApprovalGetPayload<{
  select: typeof sessionApprovalSelect;
}>;

export type AutoSignSessionApprovalDto = {
  id: string;
  userId: string;
  walletId: string | null;
  walletAddress: string | null;
  chainId: string;
  approvalType: SessionApprovalType;
  status: SessionApprovalStatus;
  approvalKey: string;
  grantee: string | null;
  scope: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  approvedAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
