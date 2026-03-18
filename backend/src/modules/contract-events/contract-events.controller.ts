import type { FastifyInstance } from "fastify";

import {
  contractEventParamsSchema,
  ingestContractEventBodySchema,
} from "./contract-events.schemas.js";
import { getContractEventById, ingestContractEvent } from "./contract-events.service.js";

export function ingestContractEventHandler(app: FastifyInstance) {
  return async (request: { body?: unknown }, reply: { status: (code: number) => void }) => {
    const body = ingestContractEventBodySchema.parse(request.body ?? {});
    const result = await ingestContractEvent(app.prisma, app.queues, body);

    reply.status(202);
    return result;
  };
}

export function getContractEventByIdHandler(app: FastifyInstance) {
  return async (request: { params?: unknown }) => {
    const { contractEventId } = contractEventParamsSchema.parse(request.params ?? {});
    const contractEvent = await getContractEventById(app.prisma, contractEventId);

    return {
      data: contractEvent,
    };
  };
}
