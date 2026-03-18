import { env } from "./config/env.js";
import { buildApp } from "./app.js";
import { registerShutdownHooks } from "./utils/shutdown.js";

async function start() {
  const app = await buildApp();

  registerShutdownHooks({
    name: "api",
    log: app.log,
    close: async () => {
      await app.close();
    },
  });

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });

    app.log.info(
      {
        host: env.HOST,
        port: env.PORT,
        apiPrefix: env.API_PREFIX,
      },
      "API server started",
    );
  } catch (error) {
    app.log.error({ err: error }, "Failed to start API server");
    process.exit(1);
  }
}

void start();
