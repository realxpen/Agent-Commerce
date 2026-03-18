import {
  Prisma,
  SessionApprovalStatus,
  SessionApprovalType,
  type PrismaClient,
} from "@prisma/client";

import type { AuthContext } from "../auth/auth.types.js";
import type {
  AutoSignSessionQuery,
  MarkAutoSignSessionUsedBody,
  RevokeAutoSignSessionBody,
  SyncAutoSignSessionBody,
} from "./session-approvals.schemas.js";
import type {
  AutoSignSessionApprovalDto,
  SessionApprovalRecord,
} from "./session-approvals.types.js";
import { sessionApprovalSelect } from "./session-approvals.types.js";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
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

function buildApprovalKey(auth: AuthContext, chainId: string) {
  return `${auth.walletId}:${chainId}:auto-sign`;
}

function toAutoSignSessionDto(record: SessionApprovalRecord): AutoSignSessionApprovalDto {
  return {
    id: record.id,
    userId: record.userId,
    walletId: record.walletId,
    walletAddress: record.wallet?.address ?? null,
    chainId: record.chainId,
    approvalType: record.approvalType,
    status: record.status,
    approvalKey: record.approvalKey,
    grantee: record.sessionPublicKey,
    scope: record.scope,
    metadata: record.metadata,
    approvedAt: toIsoString(record.approvedAt),
    expiresAt: toIsoString(record.expiresAt),
    lastUsedAt: toIsoString(record.lastUsedAt),
    revokedAt: toIsoString(record.revokedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function normalizeExpiredRecord(
  db: PrismaClient,
  record: SessionApprovalRecord | null,
) {
  if (
    !record ||
    record.status !== SessionApprovalStatus.ACTIVE ||
    !record.expiresAt ||
    record.expiresAt.getTime() > Date.now()
  ) {
    return record;
  }

  return db.sessionApproval.update({
    where: {
      id: record.id,
    },
    data: {
      status: SessionApprovalStatus.EXPIRED,
    },
    select: sessionApprovalSelect,
  });
}

export async function getCurrentAutoSignSession(
  db: PrismaClient,
  auth: AuthContext,
  query: AutoSignSessionQuery,
): Promise<AutoSignSessionApprovalDto | null> {
  const record = await db.sessionApproval.findFirst({
    where: {
      userId: auth.userId,
      walletId: auth.walletId,
      chainId: query.chainId ?? auth.chainId,
      approvalType: SessionApprovalType.AUTO_SIGN,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: sessionApprovalSelect,
  });

  const normalized = await normalizeExpiredRecord(db, record);
  return normalized ? toAutoSignSessionDto(normalized) : null;
}

export async function syncAutoSignSession(
  db: PrismaClient,
  auth: AuthContext,
  input: SyncAutoSignSessionBody,
): Promise<AutoSignSessionApprovalDto> {
  const chainId = input.chainId ?? auth.chainId;
  const approvalKey = buildApprovalKey(auth, chainId);
  const now = new Date();

  const record = await db.sessionApproval.upsert({
    where: {
      approvalKey,
    },
    create: {
      userId: auth.userId,
      walletId: auth.walletId,
      chainId,
      approvalType: SessionApprovalType.AUTO_SIGN,
      status: SessionApprovalStatus.ACTIVE,
      approvalKey,
      sessionPublicKey: input.grantee ?? null,
      scope: toNullableJsonInput(input.scope),
      metadata: toNullableJsonInput(input.metadata),
      approvedAt: now,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      lastUsedAt: now,
    },
    update: {
      status: SessionApprovalStatus.ACTIVE,
      sessionPublicKey: input.grantee ?? null,
      scope: toNullableJsonInput(input.scope),
      metadata: toNullableJsonInput(input.metadata),
      approvedAt: now,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      revokedAt: null,
    },
    select: sessionApprovalSelect,
  });

  return toAutoSignSessionDto(record);
}

export async function revokeAutoSignSession(
  db: PrismaClient,
  auth: AuthContext,
  input: RevokeAutoSignSessionBody,
): Promise<AutoSignSessionApprovalDto | null> {
  const chainId = input.chainId ?? auth.chainId;
  const approvalKey = buildApprovalKey(auth, chainId);

  const existing = await db.sessionApproval.findUnique({
    where: {
      approvalKey,
    },
    select: sessionApprovalSelect,
  });

  if (!existing) {
    return null;
  }

  const revoked = await db.sessionApproval.update({
    where: {
      approvalKey,
    },
    data: {
      status: SessionApprovalStatus.REVOKED,
      revokedAt: new Date(),
      metadata: toNullableJsonInput(input.metadata),
    },
    select: sessionApprovalSelect,
  });

  return toAutoSignSessionDto(revoked);
}

export async function markAutoSignSessionUsed(
  db: PrismaClient,
  auth: AuthContext,
  input: MarkAutoSignSessionUsedBody,
): Promise<AutoSignSessionApprovalDto | null> {
  const chainId = input.chainId ?? auth.chainId;
  const approvalKey = buildApprovalKey(auth, chainId);

  const existing = await db.sessionApproval.findUnique({
    where: {
      approvalKey,
    },
    select: sessionApprovalSelect,
  });

  if (!existing) {
    return null;
  }

  const metadata = {
    ...(existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {}),
    ...(input.metadata ?? {}),
    ...(input.surface
      ? {
          lastUsedSurface: input.surface,
        }
      : {}),
  };

  const updated = await db.sessionApproval.update({
    where: {
      approvalKey,
    },
    data: {
      lastUsedAt: new Date(),
      metadata: toNullableJsonInput(metadata),
    },
    select: sessionApprovalSelect,
  });

  return toAutoSignSessionDto(updated);
}
