import type { FastifyInstance } from "fastify";

import {
  autoSignSessionQuerySchema,
  markAutoSignSessionUsedBodySchema,
  revokeAutoSignSessionBodySchema,
  syncAutoSignSessionBodySchema,
} from "./session-approvals.schemas.js";
import {
  getCurrentAutoSignSession,
  markAutoSignSessionUsed,
  revokeAutoSignSession,
  syncAutoSignSession,
} from "./session-approvals.service.js";

export async function sessionApprovalRoutes(app: FastifyInstance) {
  app.get(
    "/auto-sign",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const query = autoSignSessionQuerySchema.parse(request.query ?? {});

      return {
        data: await getCurrentAutoSignSession(app.prisma, request.auth!, query),
      };
    },
  );

  app.post(
    "/auto-sign/sync",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const body = syncAutoSignSessionBodySchema.parse(request.body ?? {});

      return {
        data: await syncAutoSignSession(app.prisma, request.auth!, body),
      };
    },
  );

  app.post(
    "/auto-sign/revoke",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const body = revokeAutoSignSessionBodySchema.parse(request.body ?? {});

      return {
        data: await revokeAutoSignSession(app.prisma, request.auth!, body),
      };
    },
  );

  app.post(
    "/auto-sign/use",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const body = markAutoSignSessionUsedBodySchema.parse(request.body ?? {});

      return {
        data: await markAutoSignSessionUsed(app.prisma, request.auth!, body),
      };
    },
  );
}
