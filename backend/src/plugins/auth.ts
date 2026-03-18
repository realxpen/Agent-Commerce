import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { UserStatus, WalletStatus } from "@prisma/client";

import { verifyAccessToken } from "../lib/jwt.js";
import type { AuthContext } from "../modules/auth/auth.types.js";
import { createHttpError } from "../utils/http-error.js";

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext | null;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    getAuthContext: (request: FastifyRequest) => Promise<AuthContext | null>;
  }
}

function extractBearerToken(headerValue?: string) {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

export default fp(
  async (app) => {
    app.decorateRequest("auth", null);

    const resolveAuthContext = async (request: FastifyRequest) => {
      if (request.auth) {
        return request.auth;
      }

      const token = extractBearerToken(request.headers.authorization);
      if (!token) {
        return null;
      }

      const payload = verifyAccessToken(token);
      const wallet = await app.prisma.wallet.findUnique({
        where: {
          id: payload.wid,
        },
        select: {
          id: true,
          userId: true,
          chainId: true,
          address: true,
          status: true,
          type: true,
          isPrimary: true,
          user: {
            select: {
              id: true,
              displayName: true,
              status: true,
            },
          },
        },
      });

      if (!wallet || !wallet.user || wallet.userId !== payload.sub) {
        throw createHttpError(401, "Authenticated wallet session is no longer valid");
      }

      if (wallet.status !== WalletStatus.ACTIVE || wallet.user.status !== UserStatus.ACTIVE) {
        throw createHttpError(403, "Authenticated wallet session is not active");
      }

      if (wallet.address !== payload.address || wallet.chainId !== payload.chainId) {
        throw createHttpError(401, "Authenticated wallet session does not match the token");
      }

      request.auth = {
        userId: wallet.user.id,
        walletId: wallet.id,
        chainId: wallet.chainId,
        address: wallet.address,
        tokenId: payload.jti,
        user: {
          id: wallet.user.id,
          displayName: wallet.user.displayName,
          status: wallet.user.status,
        },
        wallet: {
          id: wallet.id,
          status: wallet.status,
          type: wallet.type,
          isPrimary: wallet.isPrimary,
        },
      };

      return request.auth;
    };

    app.decorate("getAuthContext", async (request) => resolveAuthContext(request));

    app.decorate("authenticate", async (request, reply) => {
      const auth = await resolveAuthContext(request);
      if (!auth) {
        throw createHttpError(401, "Authentication required");
      }

      if (reply.sent) {
        return;
      }
    });
  },
  {
    name: "auth",
    dependencies: ["prisma"],
  },
);
