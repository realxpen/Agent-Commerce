type ShutdownOptions = {
  name: string;
  log: {
    info: (payload: unknown, message?: string) => void;
    error: (payload: unknown, message?: string) => void;
  };
  close: () => Promise<void>;
};

export function registerShutdownHooks({ name, log, close }: ShutdownOptions) {
  let shuttingDown = false;

  const handleSignal = (signal: NodeJS.Signals) => async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    log.info({ signal, service: name }, "Shutting down");

    try {
      await close();
      log.info({ signal, service: name }, "Shutdown complete");
      process.exit(0);
    } catch (error) {
      log.error({ err: error, signal, service: name }, "Shutdown failed");
      process.exit(1);
    }
  };

  process.once("SIGINT", handleSignal("SIGINT"));
  process.once("SIGTERM", handleSignal("SIGTERM"));
}
