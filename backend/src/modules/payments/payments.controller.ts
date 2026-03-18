import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { createPaymentBodySchema, listPaymentsQuerySchema, paymentParamsSchema } from "./payments.schemas.js";
import { createPayment, getPaymentById, listPayments } from "./payments.service.js";
import { assertUserMatches } from "../auth/auth.service.js";

export function createPaymentHandler(app: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createPaymentBodySchema.parse(request.body ?? {});
    const payment = await createPayment(app.prisma, app.queues, body);

    reply.status(201);
    return {
      data: payment,
    };
  };
}

export function getPaymentByIdHandler(app: FastifyInstance) {
  return async (request: FastifyRequest) => {
    const { paymentId } = paymentParamsSchema.parse(request.params ?? {});
    const payment = await getPaymentById(app.prisma, paymentId);

    return {
      data: payment,
    };
  };
}

export function listPaymentsHandler(app: FastifyInstance) {
  return async (request: FastifyRequest) => {
    const query = listPaymentsQuerySchema.parse(request.query ?? {});
    const ownerId = query.ownerId ?? request.auth!.userId;

    if (query.ownerId) {
      assertUserMatches(
        request.auth!.userId,
        query.ownerId,
        "You can only view payments for your own agents",
      );
    }

    return listPayments(app.prisma, ownerId, query);
  };
}
