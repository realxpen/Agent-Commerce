import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVICE_NAME: z.string().min(1).default("agent-commerce-backend"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().min(1).default("/api/v1"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  REDIS_PREFIX: z.string().min(1).default("agent-commerce"),
  INITIA_RPC_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default("agent-commerce-backend"),
  JWT_AUDIENCE: z.string().min(1).default("agent-commerce-app"),
  AUTH_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  AUTH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  AUTH_MESSAGE_DOMAIN: z.string().min(1).default("AgentCommerce"),
  AUTH_MESSAGE_URI: z.string().url().default("http://localhost:3000"),
  AUTH_MESSAGE_STATEMENT: z
    .string()
    .min(1)
    .default("Sign this message to authenticate with AgentCommerce."),
  LLM_PROVIDER: z.enum(["openai"]).default("openai"),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

export type Env = typeof env;
