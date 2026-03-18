import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { env } from "../config/env.js";
import { createHttpError } from "../utils/http-error.js";

const accessTokenPayloadSchema = z.object({
  sub: z.string().cuid(),
  wid: z.string().cuid(),
  address: z.string().min(3).max(128),
  chainId: z.string().min(1).max(128),
  typ: z.literal("access"),
  jti: z.string().uuid(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
  iss: z.string().min(1),
  aud: z.string().min(1),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSegment(input: string) {
  return createHmac("sha256", env.JWT_SECRET).update(input).digest("base64url");
}

export function issueAccessToken(input: {
  userId: string;
  walletId: string;
  address: string;
  chainId: string;
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + env.AUTH_TOKEN_TTL_SECONDS;

  const payload: AccessTokenPayload = {
    sub: input.userId,
    wid: input.walletId,
    address: input.address,
    chainId: input.chainId,
    typ: "access",
    jti: randomUUID(),
    iat: issuedAt,
    exp: expiresAt,
    iss: env.JWT_ISSUER,
    aud: env.JWT_AUDIENCE,
  };

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signSegment(`${encodedHeader}.${encodedPayload}`);

  return {
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
    payload,
    expiresAt: new Date(expiresAt * 1000),
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw createHttpError(401, "Invalid access token");
  }

  const encodedHeader = parts[0];
  const encodedPayload = parts[1];
  const providedSignature = parts[2];

  if (!encodedHeader || !encodedPayload || !providedSignature) {
    throw createHttpError(401, "Invalid access token");
  }

  const expectedSignature = signSegment(`${encodedHeader}.${encodedPayload}`);

  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw createHttpError(401, "Invalid access token signature");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw createHttpError(401, "Invalid access token payload");
  }

  const parsed = accessTokenPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw createHttpError(401, "Invalid access token payload");
  }

  const now = Math.floor(Date.now() / 1000);
  if (parsed.data.exp <= now) {
    throw createHttpError(401, "Access token expired");
  }

  if (parsed.data.iss !== env.JWT_ISSUER || parsed.data.aud !== env.JWT_AUDIENCE) {
    throw createHttpError(401, "Invalid access token audience");
  }

  return parsed.data;
}
