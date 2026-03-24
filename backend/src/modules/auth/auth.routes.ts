import type { FastifyInstance } from "fastify";

import {
  authChallengeBodySchema,
  verifyWalletAuthBodySchema,
} from "./auth.schemas.js";
import {
  createWalletAuthChallenge,
  getCurrentAuthSession,
  verifyWalletAuthChallenge,
} from "./auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/challenge", async (request, reply) => {
    const body = authChallengeBodySchema.parse(request.body ?? {});
    const challenge = await createWalletAuthChallenge(app.redis, body);

    reply.status(201);
    return {
      data: challenge,
    };
  });

  app.post("/verify", async (request) => {
    const body = verifyWalletAuthBodySchema.parse(request.body ?? {});
    request.log.info(
      {
        address: body.address,
        chainId: body.chainId,
        algo: body.algo,
        publicKeyLength: body.publicKey.length,
        signatureLength: body.signature.length,
      },
      "Verifying wallet auth challenge",
    );
    const session = await verifyWalletAuthChallenge(app.prisma, app.redis, body);

    return {
      data: session,
    };
  });

  app.post(
    "/wallets/challenge",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const body = authChallengeBodySchema.parse(request.body ?? {});
      const challenge = await createWalletAuthChallenge(app.redis, body, request.auth!.userId);

      reply.status(201);
      return {
        data: challenge,
      };
    },
  );

  app.post(
    "/wallets/verify",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const body = verifyWalletAuthBodySchema.parse(request.body ?? {});
      request.log.info(
        {
          address: body.address,
          chainId: body.chainId,
          algo: body.algo,
          publicKeyLength: body.publicKey.length,
          signatureLength: body.signature.length,
        },
        "Verifying linked wallet auth challenge",
      );
      const session = await verifyWalletAuthChallenge(
        app.prisma,
        app.redis,
        body,
        request.auth!.userId,
      );

      return {
        data: session,
      };
    },
  );

  app.get(
    "/me",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const session = await getCurrentAuthSession(app.prisma, request.auth!);

      return {
        data: session,
      };
    },
  );
}
