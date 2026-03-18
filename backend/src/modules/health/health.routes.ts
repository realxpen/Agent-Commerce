import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { getHealthSnapshot } from "../../services/health.service.js";

const healthQuerySchema = z.object({
  verbose: z.coerce.boolean().optional().default(false),
});

export async function healthRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    const query = healthQuerySchema.parse(request.query ?? {});
    const health = await getHealthSnapshot(app);

    if (health.status !== "ok") {
      reply.status(503);
    }

    return query.verbose
      ? health
      : {
          status: health.status,
          service: health.service,
          timestamp: health.timestamp,
        };
  });
}
