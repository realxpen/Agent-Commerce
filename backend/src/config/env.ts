import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, "..", "..");
const workspaceRoot = path.resolve(backendRoot, "..");

dotenv.config({
  path: path.join(backendRoot, ".env"),
});

dotenv.config({
  path: path.join(workspaceRoot, ".env.local"),
  override: false,
});

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().min(1).optional());

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
  INITIA_RPC_URL: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().url().optional()),
  NEXT_PUBLIC_APPCHAIN_RPC_URL: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().url().optional()),
  NEXT_PUBLIC_APPCHAIN_CHAIN_ID: optionalNonEmptyString,
  NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS: optionalNonEmptyString,
  NEXT_PUBLIC_SERVICE_ESCROW_ADDRESS: optionalNonEmptyString,
  INDEXER_EVM_RPC_URL: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().url().optional()),
  INDEXER_CHAIN_ID: optionalNonEmptyString,
  AGENT_REGISTRY_CONTRACT_ADDRESS: optionalNonEmptyString,
  SERVICE_ESCROW_CONTRACT_ADDRESS: optionalNonEmptyString,
  INDEXER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  INDEXER_CONFIRMATIONS: z.coerce.number().int().min(0).default(1),
  INDEXER_BATCH_SIZE: z.coerce.number().int().positive().default(2_000),
  INDEXER_LOOKBACK_BLOCKS: z.coerce.number().int().min(0).default(2_000),
  INDEXER_START_BLOCK: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().regex(/^\d+$/).optional()),
  INDEXER_NATIVE_TOKEN_DECIMALS: z.coerce.number().int().min(0).max(36).default(18),
  INDEXER_NATIVE_TOKEN_DENOM: z.string().min(1).default("GAS"),
  WEBHOOK_SECRET: optionalNonEmptyString,
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
  LLM_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  OPENAI_TRANSCRIPTION_MODEL: z.string().min(1).default("gpt-4o-mini-transcribe"),
  OPENAI_IMAGE_MODEL: z.string().min(1).default("gpt-image-1"),
  GEMINI_API_KEY: optionalNonEmptyString,
  GEMINI_BASE_URL: z
    .string()
    .url()
    .default("https://generativelanguage.googleapis.com/v1beta"),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_TRANSCRIPTION_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_CODE_EXECUTION_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_IMAGE_MODEL: z.string().min(1).default("gemini-2.5-flash-image"),
  NEXT_PUBLIC_API_BASE_URL: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().url().optional()),
  BACKEND_PUBLIC_BASE_URL: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().url().optional()),
  UPLOAD_STORAGE_DIR: z.string().min(1).default("storage/uploads"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  ARTIFACT_STORAGE_DIR: z.string().min(1).default("storage/artifacts"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = {
  ...parsed.data,
  INDEXER_EVM_RPC_URL:
    parsed.data.INDEXER_EVM_RPC_URL ?? parsed.data.NEXT_PUBLIC_APPCHAIN_RPC_URL ?? null,
  INDEXER_CHAIN_ID:
    parsed.data.INDEXER_CHAIN_ID ?? parsed.data.NEXT_PUBLIC_APPCHAIN_CHAIN_ID ?? null,
  AGENT_REGISTRY_CONTRACT_ADDRESS:
    parsed.data.AGENT_REGISTRY_CONTRACT_ADDRESS ??
    parsed.data.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS ??
    null,
  SERVICE_ESCROW_CONTRACT_ADDRESS:
    parsed.data.SERVICE_ESCROW_CONTRACT_ADDRESS ??
    parsed.data.NEXT_PUBLIC_SERVICE_ESCROW_ADDRESS ??
    null,
  BACKEND_PUBLIC_BASE_URL:
    parsed.data.BACKEND_PUBLIC_BASE_URL ??
    parsed.data.NEXT_PUBLIC_API_BASE_URL ??
    `http://localhost:${parsed.data.PORT}`,
} as const;

export type Env = typeof env;
