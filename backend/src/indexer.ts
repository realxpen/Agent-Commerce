import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { registerShutdownHooks } from "./utils/shutdown.js";

async function start() {
  const intervalMs = 30_000;

  const timer = setInterval(() => {
    logger.debug(
      {
        rpcUrl: env.INITIA_RPC_URL ?? null,
      },
      "Indexer heartbeat",
    );
  }, intervalMs);

  logger.info(
    {
      rpcUrl: env.INITIA_RPC_URL ?? null,
      intervalMs,
    },
    "Indexer scaffold started",
  );

  registerShutdownHooks({
    name: "indexer",
    log: logger,
    close: async () => {
      clearInterval(timer);
    },
  });
}

void start();
