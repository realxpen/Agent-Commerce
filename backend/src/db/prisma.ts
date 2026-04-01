import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

import { env } from "../config/env.js";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const prismaClientDir = path.resolve(currentDir, "..", "..", "node_modules", ".prisma", "client");

if (!process.env.PRISMA_CLIENT_ENGINE_TYPE) {
  process.env.PRISMA_CLIENT_ENGINE_TYPE = "library";
}

if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY && fs.existsSync(prismaClientDir)) {
  const engineFile = fs
    .readdirSync(prismaClientDir)
    .find((entry) => /^query_engine-.*\.(dll\.node|so\.node|dylib\.node)$/.test(entry));

  if (engineFile) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(prismaClientDir, engineFile);
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    transactionOptions: {
      maxWait: 10_000,
      timeout: 20_000,
    },
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
