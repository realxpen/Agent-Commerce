import type { FastifyInstance } from "fastify";

import {
  getTaskRunByIdHandler,
  listTaskRunsHandler,
  triggerOrderTaskProcessingHandler,
} from "./ai-tasks.controller.js";

export async function aiTaskRoutes(app: FastifyInstance) {
  app.post("/orders/:orderId/trigger", triggerOrderTaskProcessingHandler(app));
  app.get(
    "/runs",
    {
      preHandler: app.authenticate,
    },
    listTaskRunsHandler(app),
  );
  app.get("/runs/:taskRunId", getTaskRunByIdHandler(app));
}
