import type { FastifyInstance } from "fastify";

import { assertUserOwnsAgent, assertUserOwnsService } from "../auth/auth.service.js";
import {
  agentParamsSchema,
  createServiceBodySchema,
  listServicesQuerySchema,
  serviceParamsSchema,
  updateServiceBodySchema,
} from "./services.schemas.js";
import {
  createService,
  getServiceById,
  listServices,
  publishService,
  updateService,
} from "./services.service.js";

export async function serviceRoutes(app: FastifyInstance) {
  app.get("/services", async (request) => {
    const query = listServicesQuerySchema.parse(request.query ?? {});
    return listServices(app.prisma, query);
  });

  app.get("/services/:serviceId", async (request) => {
    const { serviceId } = serviceParamsSchema.parse(request.params ?? {});
    const service = await getServiceById(app.prisma, serviceId);

    return {
      data: service,
    };
  });

  app.patch(
    "/services/:serviceId",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { serviceId } = serviceParamsSchema.parse(request.params ?? {});
      await assertUserOwnsService(app.prisma, request.auth!.userId, serviceId);
      const body = updateServiceBodySchema.parse(request.body ?? {});
      const service = await updateService(app.prisma, serviceId, body);

      return {
        data: service,
      };
    },
  );

  app.post(
    "/services/:serviceId/publish",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { serviceId } = serviceParamsSchema.parse(request.params ?? {});
      await assertUserOwnsService(app.prisma, request.auth!.userId, serviceId);
      const service = await publishService(app.prisma, serviceId);

      return {
        data: service,
      };
    },
  );

  app.get("/agents/:agentId/services", async (request) => {
    const { agentId } = agentParamsSchema.parse(request.params ?? {});
    const query = listServicesQuerySchema.parse({
      ...(request.query ?? {}),
      agentId,
    });

    return listServices(app.prisma, query);
  });

  app.post(
    "/agents/:agentId/services",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { agentId } = agentParamsSchema.parse(request.params ?? {});
      await assertUserOwnsAgent(app.prisma, request.auth!.userId, agentId);
      const body = createServiceBodySchema.parse(request.body ?? {});
      const service = await createService(app.prisma, {
        ...body,
        agentId,
      });

      reply.status(201);
      return {
        data: service,
      };
    },
  );
}
