import type { FastifyInstance } from "fastify";

import {
  assertUserCanCompleteOrder,
  assertUserCanManageOrder,
  assertUserCanViewOrder,
  assertUserMatches,
} from "../auth/auth.service.js";
import {
  attachDeliverable,
  createOrder,
  getOrderById,
  listOrdersForAgentOwner,
  listOrdersForUser,
  markOrderCompleted,
  requestOrderRevision,
  updateOrderStatus,
} from "./orders.service.js";
import {
  attachDeliverableBodySchema,
  createOrderBodySchema,
  customerOrdersParamsSchema,
  listOrdersForOwnerQuerySchema,
  listOrdersForUserQuerySchema,
  orderParamsSchema,
  ownerOrdersParamsSchema,
  requestOrderRevisionBodySchema,
  updateOrderStatusBodySchema,
} from "./orders.schemas.js";

export async function orderRoutes(app: FastifyInstance) {
  app.post(
    "/",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const body = createOrderBodySchema.parse(request.body ?? {});
      const order = await createOrder(app.prisma, {
        ...body,
        customerId: request.auth!.userId,
      });

      reply.status(201);
      return {
        data: order,
      };
    },
  );

  app.get(
    "/customer/:customerId",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { customerId } = customerOrdersParamsSchema.parse(request.params ?? {});
      assertUserMatches(
        request.auth!.userId,
        customerId,
        "You can only view your own customer orders",
      );
      const query = listOrdersForUserQuerySchema.parse(request.query ?? {});
      return listOrdersForUser(app.prisma, customerId, query);
    },
  );

  app.get(
    "/owner/:ownerId",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { ownerId } = ownerOrdersParamsSchema.parse(request.params ?? {});
      assertUserMatches(
        request.auth!.userId,
        ownerId,
        "You can only view orders for your own agents",
      );
      const query = listOrdersForOwnerQuerySchema.parse(request.query ?? {});
      return listOrdersForAgentOwner(app.prisma, ownerId, query);
    },
  );

  app.get(
    "/:orderId",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { orderId } = orderParamsSchema.parse(request.params ?? {});
      await assertUserCanViewOrder(app.prisma, request.auth!.userId, orderId);
      const order = await getOrderById(app.prisma, orderId);

      return {
        data: order,
      };
    },
  );

  app.patch(
    "/:orderId/status",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { orderId } = orderParamsSchema.parse(request.params ?? {});
      await assertUserCanManageOrder(app.prisma, request.auth!.userId, orderId);
      const body = updateOrderStatusBodySchema.parse(request.body ?? {});
      const order = await updateOrderStatus(app.prisma, app.queues, orderId, body);

      return {
        data: order,
      };
    },
  );

  app.post(
    "/:orderId/deliverable",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { orderId } = orderParamsSchema.parse(request.params ?? {});
      await assertUserCanManageOrder(app.prisma, request.auth!.userId, orderId);
      const body = attachDeliverableBodySchema.parse(request.body ?? {});
      const order = await attachDeliverable(app.prisma, orderId, body, request.auth!.userId);

      return {
        data: order,
      };
    },
  );

  app.post(
    "/:orderId/revision-request",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { orderId } = orderParamsSchema.parse(request.params ?? {});
      await assertUserCanCompleteOrder(app.prisma, request.auth!.userId, orderId);
      const body = requestOrderRevisionBodySchema.parse(request.body ?? {});
      const order = await requestOrderRevision(app.prisma, app.queues, orderId, {
        customerId: request.auth!.userId,
        note: body.note,
        customerReferences: body.customerReferences,
      });

      return {
        data: order,
      };
    },
  );

  app.post(
    "/:orderId/complete",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const { orderId } = orderParamsSchema.parse(request.params ?? {});
      await assertUserCanCompleteOrder(app.prisma, request.auth!.userId, orderId);
      const order = await markOrderCompleted(app.prisma, orderId);

      return {
        data: order,
      };
    },
  );
}
