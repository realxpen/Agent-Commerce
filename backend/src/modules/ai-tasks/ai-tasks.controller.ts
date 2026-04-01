import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  listTaskRunsQuerySchema,
  orderTaskParamsSchema,
  taskRunParamsSchema,
  triggerTaskProcessingBodySchema,
} from "./ai-tasks.schemas.js";
import { getTaskRunById, listTaskRuns, triggerTaskProcessingForOrder } from "./task.service.js";
import { assertUserCanManageOrder, assertUserMatches } from "../auth/auth.service.js";

export function triggerOrderTaskProcessingHandler(app: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { orderId } = orderTaskParamsSchema.parse(request.params ?? {});
    await assertUserCanManageOrder(app.prisma, request.auth!.userId, orderId);
    const body = triggerTaskProcessingBodySchema.parse(request.body ?? {});

    const result = await triggerTaskProcessingForOrder(app.prisma, app.queues, {
      orderId,
      source: "owner-resume",
      force: body.force,
      taskConfig: body,
    });

    reply.status(202);
    return result;
  };
}

export function getTaskRunByIdHandler(app: FastifyInstance) {
  return async (request: FastifyRequest) => {
    const { taskRunId } = taskRunParamsSchema.parse(request.params ?? {});
    const taskRun = await getTaskRunById(app.prisma, taskRunId);

    return {
      data: taskRun,
    };
  };
}

export function listTaskRunsHandler(app: FastifyInstance) {
  return async (request: FastifyRequest) => {
    const query = listTaskRunsQuerySchema.parse(request.query ?? {});
    const ownerId = query.ownerId ?? request.auth!.userId;

    if (query.ownerId) {
      assertUserMatches(
        request.auth!.userId,
        query.ownerId,
        "You can only view task runs for your own agents",
      );
    }

    return listTaskRuns(app.prisma, ownerId, query);
  };
}
