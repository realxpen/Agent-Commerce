import type { FastifyInstance } from "fastify";

import { assertUserOwnsAgent } from "../auth/auth.service.js";
import {
  archiveAgent,
  createAgent,
  getAgentById,
  listAgents,
  publishAgent,
  updateAgent,
} from "./agents.service.js";
import {
  agentParamsSchema,
  createAgentBodySchema,
  listAgentsQuerySchema,
  updateAgentBodySchema,
} from "./agents.schemas.js";

export async function agentRoutes(app: FastifyInstance) {
  app.post(
    "/",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const body = createAgentBodySchema.parse(request.body ?? {});
      const agent = await createAgent(app.prisma, {
        ...body,
        ownerId: request.auth!.userId,
      });

      reply.status(201);
      return {
        data: agent,
      };
    },
  );

  app.get("/", async (request) => {
    const query = listAgentsQuerySchema.parse(request.query ?? {});
    return listAgents(app.prisma, query);
  });

  app.get("/:agentId", async (request) => {
    const { agentId } = agentParamsSchema.parse(request.params ?? {});
    const agent = await getAgentById(app.prisma, agentId);

    return {
      data: agent,
    };
  });

  app.patch(
    "/:agentId",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { agentId } = agentParamsSchema.parse(request.params ?? {});
      await assertUserOwnsAgent(app.prisma, request.auth!.userId, agentId);
      const body = updateAgentBodySchema.parse(request.body ?? {});
      const agent = await updateAgent(app.prisma, agentId, body);

      return {
        data: agent,
      };
    },
  );

  app.post(
    "/:agentId/publish",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { agentId } = agentParamsSchema.parse(request.params ?? {});
      await assertUserOwnsAgent(app.prisma, request.auth!.userId, agentId);
      const agent = await publishAgent(app.prisma, agentId);

      return {
        data: agent,
      };
    },
  );

  app.post(
    "/:agentId/archive",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { agentId } = agentParamsSchema.parse(request.params ?? {});
      await assertUserOwnsAgent(app.prisma, request.auth!.userId, agentId);
      const agent = await archiveAgent(app.prisma, agentId);

      return {
        data: agent,
      };
    },
  );
}
