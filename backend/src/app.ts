import Fastify from "fastify";
import { ZodError } from "zod";

import { registerPlugins } from "./plugins/index.js";
import { registerRoutes } from "./routes/index.js";
import { getLoggerOptions } from "./lib/logger.js";

export async function buildApp() {
  const app = Fastify({
    logger: getLoggerOptions(),
    trustProxy: true,
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Validation error",
        issues: error.flatten(),
      });
    }

    request.log.error({ err: error }, "Unhandled application error");

    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;

    return reply.status(statusCode).send({
      message:
        statusCode >= 500
          ? "Internal server error"
          : error instanceof Error
            ? error.message
            : "Request failed",
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      message: `Route not found: ${request.method} ${request.url}`,
    });
  });

  await registerPlugins(app);
  await registerRoutes(app);

  return app;
}
