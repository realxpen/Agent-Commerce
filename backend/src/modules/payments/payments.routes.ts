import type { FastifyInstance } from "fastify";

import {
  createPaymentHandler,
  getPaymentByIdHandler,
  listPaymentsHandler,
} from "./payments.controller.js";

export async function paymentRoutes(app: FastifyInstance) {
  app.get(
    "/",
    {
      preHandler: app.authenticate,
    },
    listPaymentsHandler(app),
  );
  app.post("/", createPaymentHandler(app));
  app.get("/:paymentId", getPaymentByIdHandler(app));
}
