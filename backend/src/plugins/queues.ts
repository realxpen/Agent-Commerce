import fp from "fastify-plugin";

import { closeQueues, createQueues, type AppQueues } from "../queues/index.js";

declare module "fastify" {
  interface FastifyInstance {
    queues: AppQueues;
  }
}

export default fp(
  async (app) => {
    const queues = createQueues();

    app.decorate("queues", queues);

    app.addHook("onClose", async () => {
      await closeQueues(queues);
    });
  },
  {
    name: "queues",
  },
);
