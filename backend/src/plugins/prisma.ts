import fp from "fastify-plugin";
import type { PrismaClient } from "@prisma/client";

import { prisma } from "../db/prisma.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(
  async (app) => {
    await prisma.$connect();
    app.decorate("prisma", prisma);

    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  },
  {
    name: "prisma",
  },
);
