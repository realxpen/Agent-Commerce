import { randomBytes, randomUUID } from "node:crypto";

import { fromBase64, fromBech32, normalizeBech32 } from "@cosmjs/encoding";
import {
  UserStatus,
  WalletStatus,
  WalletType,
  type Prisma,
  type PrismaClient,
  type User,
} from "@prisma/client";
import { verifyADR36Amino } from "@keplr-wallet/cosmos";
import type { Redis } from "ioredis";
import { z } from "zod";

import { issueAccessToken } from "../../lib/jwt.js";
import { createHttpError } from "../../utils/http-error.js";
import type { AuthChallengeBody, VerifyWalletAuthBody } from "./auth.schemas.js";
import {
  authUserSelect,
  type AuthChallengeDto,
  type AuthContext,
  type AuthSessionDto,
  type AuthUserDto,
  type AuthUserRecord,
  type AuthWalletDto,
} from "./auth.types.js";
import { env } from "../../config/env.js";

const storedChallengeSchema = z.object({
  nonce: z.string(),
  requestId: z.string(),
  address: z.string(),
  chainId: z.string(),
  message: z.string(),
  algo: z.enum(["secp256k1", "ethsecp256k1"]),
  issuedAt: z.string(),
  expiresAt: z.string(),
  requestedByUserId: z.string().cuid().nullable(),
});

type StoredChallenge = z.infer<typeof storedChallengeSchema>;

type AuthStore = PrismaClient | Prisma.TransactionClient;

function getChallengeKey(nonce: string) {
  return `${env.REDIS_PREFIX}:auth:challenge:${nonce}`;
}

function normalizeWalletAddress(address: string) {
  try {
    return normalizeBech32(address.trim());
  } catch {
    throw createHttpError(400, "Invalid wallet address");
  }
}

function getWalletAddressPrefix(address: string) {
  try {
    return fromBech32(address).prefix;
  } catch {
    throw createHttpError(400, "Invalid wallet address prefix");
  }
}

function shortenAddress(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function verifyAdr36Signature(input: {
  bech32Prefix: string;
  address: string;
  message: string;
  publicKey: Uint8Array;
  signature: Uint8Array;
  algo: "secp256k1" | "ethsecp256k1";
}) {
  try {
    return verifyADR36Amino(
      input.bech32Prefix,
      input.address,
      input.message,
      input.publicKey,
      input.signature,
      input.algo,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet signature verification failed";

    if (
      message.includes("Unmatched signer") ||
      message.includes("Invalid sign doc for ADR-36") ||
      message.includes("Chain id should be empty string") ||
      message.includes("Memo should be empty string") ||
      message.includes("Account number should be") ||
      message.includes("Sequence should be") ||
      message.includes("Gas should be") ||
      message.includes("Fee amount should be") ||
      message.includes("Invalid type of ADR-36 sign msg") ||
      message.includes("Empty signer") ||
      message.includes("Empty data") ||
      message.includes("Data is not encoded by base64")
    ) {
      throw createHttpError(401, "Wallet signature verification failed");
    }

    throw error;
  }
}

function buildAuthMessage(input: {
  address: string;
  chainId: string;
  nonce: string;
  requestId: string;
  issuedAt: string;
  expiresAt: string;
}) {
  return [
    `${env.AUTH_MESSAGE_DOMAIN} wants you to sign in with your wallet:`,
    input.address,
    "",
    env.AUTH_MESSAGE_STATEMENT,
    "",
    `URI: ${env.AUTH_MESSAGE_URI}`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expiresAt}`,
    `Request ID: ${input.requestId}`,
  ].join("\n");
}

function toWalletDto(wallet: AuthUserRecord["wallets"][number]): AuthWalletDto {
  return {
    id: wallet.id,
    chainId: wallet.chainId,
    address: wallet.address,
    label: wallet.label,
    type: wallet.type,
    status: wallet.status,
    isPrimary: wallet.isPrimary,
    lastUsedAt: wallet.lastUsedAt?.toISOString() ?? null,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

function toUserDto(user: AuthUserRecord): AuthUserDto {
  return {
    id: user.id,
    displayName: user.displayName,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    wallets: user.wallets.map(toWalletDto),
  };
}

async function findUserForSessionOrThrow(db: AuthStore, userId: string): Promise<AuthUserRecord> {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: authUserSelect,
  });

  if (!user) {
    throw createHttpError(404, "Authenticated user not found");
  }

  return user;
}

function ensureActiveUser(user: Pick<User, "status">) {
  if (user.status !== UserStatus.ACTIVE) {
    throw createHttpError(403, "User account is not active");
  }
}

function buildAuthSession(input: {
  user: AuthUserRecord;
  activeWalletId: string;
  isNewUser: boolean;
  linkedWallet: boolean;
}): AuthSessionDto {
  const activeWallet = input.user.wallets.find((wallet) => wallet.id === input.activeWalletId);

  if (!activeWallet) {
    throw createHttpError(500, "Active wallet not found for session");
  }

  const accessToken = issueAccessToken({
    userId: input.user.id,
    walletId: activeWallet.id,
    address: activeWallet.address,
    chainId: activeWallet.chainId,
  });

  return {
    tokenType: "Bearer",
    accessToken: accessToken.token,
    expiresAt: accessToken.expiresAt.toISOString(),
    user: toUserDto(input.user),
    activeWallet: toWalletDto(activeWallet),
    meta: {
      isNewUser: input.isNewUser,
      linkedWallet: input.linkedWallet,
    },
  };
}

async function persistChallenge(redis: Redis, challenge: StoredChallenge) {
  await redis.set(
    getChallengeKey(challenge.nonce),
    JSON.stringify(challenge),
    "EX",
    env.AUTH_CHALLENGE_TTL_SECONDS,
  );
}

async function loadChallengeOrThrow(redis: Redis, nonce: string): Promise<StoredChallenge> {
  const rawChallenge = await redis.get(getChallengeKey(nonce));
  if (!rawChallenge) {
    throw createHttpError(401, "Authentication challenge was not found or has expired");
  }

  let parsedChallenge: unknown;
  try {
    parsedChallenge = JSON.parse(rawChallenge);
  } catch {
    throw createHttpError(500, "Stored authentication challenge is invalid");
  }

  const parsed = storedChallengeSchema.safeParse(parsedChallenge);
  if (!parsed.success) {
    throw createHttpError(500, "Stored authentication challenge is invalid");
  }

  if (new Date(parsed.data.expiresAt).getTime() <= Date.now()) {
    await redis.del(getChallengeKey(nonce));
    throw createHttpError(401, "Authentication challenge has expired");
  }

  return parsed.data;
}

async function consumeChallenge(redis: Redis, nonce: string) {
  await redis.del(getChallengeKey(nonce));
}

export async function createWalletAuthChallenge(
  redis: Redis,
  input: AuthChallengeBody,
  requestedByUserId?: string,
): Promise<AuthChallengeDto> {
  const address = normalizeWalletAddress(input.address);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + env.AUTH_CHALLENGE_TTL_SECONDS * 1000);
  const nonce = randomBytes(16).toString("hex");
  const requestId = randomUUID();
  const message = buildAuthMessage({
    address,
    chainId: input.chainId.trim(),
    nonce,
    requestId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  await persistChallenge(redis, {
    nonce,
    requestId,
    address,
    chainId: input.chainId.trim(),
    message,
    algo: input.algo,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    requestedByUserId: requestedByUserId ?? null,
  });

  return {
    nonce,
    requestId,
    address,
    chainId: input.chainId.trim(),
    message,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifyWalletAuthChallenge(
  db: PrismaClient,
  redis: Redis,
  input: VerifyWalletAuthBody,
  requestedByUserId?: string,
): Promise<AuthSessionDto> {
  const address = normalizeWalletAddress(input.address);
  const challenge = await loadChallengeOrThrow(redis, input.nonce);

  if (challenge.address !== address || challenge.chainId !== input.chainId.trim()) {
    throw createHttpError(400, "Authentication challenge does not match the wallet request");
  }

  if (challenge.requestedByUserId && challenge.requestedByUserId !== requestedByUserId) {
    throw createHttpError(403, "Authentication challenge belongs to a different user session");
  }

  const bech32Prefix = getWalletAddressPrefix(address);

  let publicKey: Uint8Array;
  let signature: Uint8Array;
  try {
    publicKey = fromBase64(input.publicKey);
    signature = fromBase64(input.signature);
  } catch {
    throw createHttpError(400, "publicKey and signature must be valid base64 strings");
  }

  const isValid = verifyAdr36Signature({
    bech32Prefix,
    address,
    message: challenge.message,
    publicKey,
    signature,
    algo: input.algo,
  });

  if (!isValid) {
    throw createHttpError(401, "Wallet signature verification failed");
  }

  const now = new Date();

  const session = await db.$transaction(async (tx) => {
    const existingWallet = await tx.wallet.findUnique({
      where: {
        chainId_address: {
          chainId: challenge.chainId,
          address,
        },
      },
      select: {
        id: true,
        userId: true,
        isPrimary: true,
      },
    });

    if (existingWallet?.userId && requestedByUserId && existingWallet.userId !== requestedByUserId) {
      throw createHttpError(409, "Wallet is already linked to another user");
    }

    let userId = requestedByUserId ?? existingWallet?.userId ?? null;
    let isNewUser = false;
    let linkedWallet = false;

    if (!userId) {
      const createdUser = await tx.user.create({
        data: {
          displayName: `Wallet ${shortenAddress(address)}`,
          status: UserStatus.ACTIVE,
        },
        select: {
          id: true,
        },
      });

      userId = createdUser.id;
      isNewUser = true;
    }

    if (!existingWallet) {
      const existingWalletCount = await tx.wallet.count({
        where: {
          userId,
        },
      });

      await tx.wallet.create({
        data: {
          userId,
          chainId: challenge.chainId,
          address,
          type: WalletType.EXTERNAL,
          status: WalletStatus.ACTIVE,
          isPrimary: existingWalletCount === 0,
          metadata: {
            authMethod: "cosmos_adr36",
            publicKey: input.publicKey,
            algo: input.algo,
            lastVerifiedAt: now.toISOString(),
          } satisfies Prisma.InputJsonObject,
          lastUsedAt: now,
        },
      });

      linkedWallet = !isNewUser;
    } else {
      await tx.wallet.update({
        where: {
          id: existingWallet.id,
        },
        data: {
          userId,
          status: WalletStatus.ACTIVE,
          metadata: {
            authMethod: "cosmos_adr36",
            publicKey: input.publicKey,
            algo: input.algo,
            lastVerifiedAt: now.toISOString(),
          } satisfies Prisma.InputJsonObject,
          lastUsedAt: now,
        },
      });

      linkedWallet = Boolean(requestedByUserId && !existingWallet.userId);
    }

    const user = await findUserForSessionOrThrow(tx, userId);
    ensureActiveUser(user);

    const activeWallet = user.wallets.find(
      (wallet) => wallet.chainId === challenge.chainId && wallet.address === address,
    );

    if (!activeWallet) {
      throw createHttpError(500, "Verified wallet could not be loaded for the session");
    }

    return buildAuthSession({
      user,
      activeWalletId: activeWallet.id,
      isNewUser,
      linkedWallet,
    });
  });

  await consumeChallenge(redis, challenge.nonce);

  return session;
}

export async function getCurrentAuthSession(
  db: PrismaClient,
  auth: AuthContext,
): Promise<Pick<AuthSessionDto, "user" | "activeWallet">> {
  const user = await findUserForSessionOrThrow(db, auth.userId);
  ensureActiveUser(user);

  const activeWallet = user.wallets.find((wallet) => wallet.id === auth.walletId);
  if (!activeWallet) {
    throw createHttpError(404, "Authenticated wallet not found");
  }

  return {
    user: toUserDto(user),
    activeWallet: toWalletDto(activeWallet),
  };
}

export function assertUserMatches(authUserId: string, requestedUserId: string, message: string) {
  if (authUserId !== requestedUserId) {
    throw createHttpError(403, message);
  }
}

export async function assertUserOwnsAgent(
  db: PrismaClient,
  userId: string,
  agentId: string,
) {
  const agent = await db.agent.findUnique({
    where: {
      id: agentId,
    },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!agent) {
    throw createHttpError(404, "Agent not found");
  }

  if (agent.ownerId !== userId) {
    throw createHttpError(403, "You do not have access to this agent");
  }
}

export async function assertUserOwnsService(
  db: PrismaClient,
  userId: string,
  serviceId: string,
) {
  const service = await db.agentService.findUnique({
    where: {
      id: serviceId,
    },
    select: {
      id: true,
      agent: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!service) {
    throw createHttpError(404, "Service not found");
  }

  if (service.agent.ownerId !== userId) {
    throw createHttpError(403, "You do not have access to this service");
  }
}

async function getOrderAccessRecord(db: PrismaClient, orderId: string) {
  const order = await db.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
      customerId: true,
      agent: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  return order;
}

export async function assertUserCanViewOrder(
  db: PrismaClient,
  userId: string,
  orderId: string,
) {
  const order = await getOrderAccessRecord(db, orderId);

  if (order.customerId !== userId && order.agent.ownerId !== userId) {
    throw createHttpError(403, "You do not have access to this order");
  }
}

export async function assertUserCanManageOrder(
  db: PrismaClient,
  userId: string,
  orderId: string,
) {
  const order = await getOrderAccessRecord(db, orderId);

  if (order.agent.ownerId !== userId) {
    throw createHttpError(403, "Only the agent owner can manage this order");
  }
}

export async function assertUserCanCompleteOrder(
  db: PrismaClient,
  userId: string,
  orderId: string,
) {
  const order = await getOrderAccessRecord(db, orderId);

  if (order.customerId !== userId && order.agent.ownerId !== userId) {
    throw createHttpError(403, "You do not have access to complete this order");
  }
}
