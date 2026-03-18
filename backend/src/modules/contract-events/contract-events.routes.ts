import type { FastifyInstance } from "fastify";

import {
  getContractEventByIdHandler,
  ingestContractEventHandler,
} from "./contract-events.controller.js";

export async function contractEventRoutes(app: FastifyInstance) {
  app.post("/ingest", ingestContractEventHandler(app));
  app.get("/:contractEventId", getContractEventByIdHandler(app));
}
