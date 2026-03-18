import pino, { type LoggerOptions } from "pino";

import { env } from "../config/env.js";

export function getLoggerOptions(): LoggerOptions {
  const options: LoggerOptions = {
    name: env.SERVICE_NAME,
    level: env.LOG_LEVEL,
  };

  if (env.NODE_ENV === "development") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    };
  }

  return options;
}

export const logger = pino(getLoggerOptions());
