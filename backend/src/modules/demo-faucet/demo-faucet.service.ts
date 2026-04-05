import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { normalizeBech32 } from "@cosmjs/encoding";
import type { Redis } from "ioredis";

import { env } from "../../config/env.js";
import { createHttpError } from "../../utils/http-error.js";
import type { AuthContext } from "../auth/auth.types.js";
import type { DemoFaucetRequestBody } from "./demo-faucet.schemas.js";
import type { DemoFaucetRequestDto, DemoFaucetStatusDto } from "./demo-faucet.types.js";

const execFileAsync = promisify(execFile);

function getDemoFaucetStatusReason() {
  if (!env.DEMO_FAUCET_ENABLED) {
    return "The demo faucet is turned off.";
  }

  if (!env.DEMO_FAUCET_CHAIN_ID) {
    return "Set DEMO_FAUCET_CHAIN_ID before exposing the demo faucet.";
  }

  if (!env.DEMO_FAUCET_AMOUNT) {
    return "Set DEMO_FAUCET_AMOUNT before exposing the demo faucet.";
  }

  if (!env.INITIA_RPC_URL) {
    return "Set INITIA_RPC_URL before exposing the demo faucet.";
  }

  return null;
}

function getDemoFaucetStatusSnapshot(): DemoFaucetStatusDto {
  const reason = getDemoFaucetStatusReason();

  return {
    enabled: env.DEMO_FAUCET_ENABLED,
    available: reason === null,
    requiresAuth: env.DEMO_FAUCET_REQUIRE_AUTH,
    chainId: env.DEMO_FAUCET_CHAIN_ID,
    amount: env.DEMO_FAUCET_AMOUNT,
    addressPrefix: env.DEMO_FAUCET_ALLOWED_ADDRESS_PREFIX,
    displayName: env.NEXT_PUBLIC_APPCHAIN_DISPLAY_NAME ?? "AgentCommerce",
    adminModeEnabled: Boolean(env.DEMO_FAUCET_ADMIN_TOKEN),
    reason,
  };
}

function assertDemoFaucetAvailable() {
  const status = getDemoFaucetStatusSnapshot();

  if (!status.enabled) {
    throw createHttpError(404, "Demo faucet is not enabled on this deployment");
  }

  if (!status.available) {
    throw createHttpError(503, status.reason ?? "Demo faucet is not configured yet");
  }

  return status;
}

function normalizeRequestedAddress(input: string) {
  let normalized: string;
  try {
    normalized = normalizeBech32(input.trim());
  } catch {
    throw createHttpError(400, "Enter a valid Initia wallet address");
  }

  if (!normalized.startsWith(`${env.DEMO_FAUCET_ALLOWED_ADDRESS_PREFIX}1`)) {
    throw createHttpError(
      400,
      `Only ${env.DEMO_FAUCET_ALLOWED_ADDRESS_PREFIX} addresses can receive demo gas`,
    );
  }

  return normalized;
}

function resolveFundingAddress(input: {
  body: DemoFaucetRequestBody;
  auth: AuthContext | null;
  mode: "self-serve" | "admin";
}) {
  const requestedAddress = input.body.address?.trim() ?? "";

  if (input.mode === "admin") {
    if (!requestedAddress) {
      throw createHttpError(400, "Provide the wallet address to fund");
    }

    return normalizeRequestedAddress(requestedAddress);
  }

  if (env.DEMO_FAUCET_REQUIRE_AUTH) {
    if (!input.auth) {
      throw createHttpError(401, "Connect and unlock backend sync before requesting demo gas");
    }

    if (requestedAddress && requestedAddress !== input.auth.address) {
      throw createHttpError(
        403,
        "The self-serve faucet only funds the connected wallet address",
      );
    }

    return normalizeRequestedAddress(input.auth.address);
  }

  const fallbackAddress = requestedAddress || input.auth?.address;
  if (!fallbackAddress) {
    throw createHttpError(400, "Provide the wallet address that should receive demo gas");
  }

  return normalizeRequestedAddress(fallbackAddress);
}

async function enforceRateLimit(input: {
  redis: Redis;
  address: string;
  requesterIp: string | null;
  mode: "self-serve" | "admin";
}) {
  if (input.mode === "admin") {
    return;
  }

  const windowSeconds = env.DEMO_FAUCET_RATE_LIMIT_WINDOW_SECONDS;
  const maxRequests = env.DEMO_FAUCET_MAX_REQUESTS_PER_WINDOW;
  const keys = [
    `${env.REDIS_PREFIX}:demo-faucet:address:${input.address.toLowerCase()}`,
  ];

  if (input.requesterIp) {
    keys.push(`${env.REDIS_PREFIX}:demo-faucet:ip:${input.requesterIp}`);
  }

  for (const key of keys) {
    const count = await input.redis.incr(key);
    if (count === 1) {
      await input.redis.expire(key, windowSeconds);
    }

    if (count > maxRequests) {
      const ttl = await input.redis.ttl(key);
      throw createHttpError(
        429,
        ttl > 0
          ? `Demo faucet limit reached. Try again in about ${ttl} seconds.`
          : "Demo faucet limit reached. Try again later.",
      );
    }
  }
}

function extractTxHash(rawOutput: string) {
  const trimmed = rawOutput.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as { txhash?: string; txHash?: string };
    return parsed.txhash ?? parsed.txHash ?? null;
  } catch {
    const match = trimmed.match(/txhash["':\s]+([0-9a-fA-F]+)/i);
    return match?.[1] ?? null;
  }
}

async function executeFundingTransfer(address: string) {
  if (!env.DEMO_FAUCET_CHAIN_ID || !env.DEMO_FAUCET_AMOUNT || !env.INITIA_RPC_URL) {
    throw createHttpError(503, "Demo faucet is not configured yet");
  }

  const args = [
    "tx",
    "bank",
    "send",
    env.DEMO_FAUCET_KEY_NAME,
    address,
    env.DEMO_FAUCET_AMOUNT,
    "--from",
    env.DEMO_FAUCET_KEY_NAME,
    "--keyring-backend",
    env.DEMO_FAUCET_KEYRING_BACKEND,
    "--chain-id",
    env.DEMO_FAUCET_CHAIN_ID,
    "--node",
    env.INITIA_RPC_URL,
    "--gas",
    "auto",
    "--gas-adjustment",
    "1.4",
    "--yes",
    "--output",
    "json",
  ];

  try {
    const { stdout, stderr } = await execFileAsync(env.DEMO_FAUCET_CLI_PATH, args, {
      timeout: 45_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });

    return {
      txHash: extractTxHash(stdout || stderr || ""),
    };
  } catch (error) {
    const details =
      error instanceof Error
        ? "stderr" in error && typeof error.stderr === "string" && error.stderr.trim().length > 0
          ? error.stderr
          : error.message
        : "Unknown faucet execution failure";

    throw createHttpError(502, `Demo faucet transfer failed: ${details}`);
  }
}

function assertAdminTokenMatches(headerValue: string | undefined) {
  if (!env.DEMO_FAUCET_ADMIN_TOKEN) {
    throw createHttpError(404, "Demo faucet admin mode is not enabled on this deployment");
  }

  if (!headerValue || headerValue !== env.DEMO_FAUCET_ADMIN_TOKEN) {
    throw createHttpError(403, "Demo faucet admin token is missing or invalid");
  }
}

export function getDemoFaucetStatus() {
  return getDemoFaucetStatusSnapshot();
}

export async function requestDemoFaucetFunding(input: {
  redis: Redis;
  body: DemoFaucetRequestBody;
  auth: AuthContext | null;
  requesterIp: string | null;
}): Promise<DemoFaucetRequestDto> {
  assertDemoFaucetAvailable();

  const requestedAddress = resolveFundingAddress({
    body: input.body,
    auth: input.auth,
    mode: "self-serve",
  });

  await enforceRateLimit({
    redis: input.redis,
    address: requestedAddress,
    requesterIp: input.requesterIp,
    mode: "self-serve",
  });

  const result = await executeFundingTransfer(requestedAddress);

  return {
    requestedAddress,
    chainId: env.DEMO_FAUCET_CHAIN_ID!,
    amount: env.DEMO_FAUCET_AMOUNT!,
    txHash: result.txHash,
    fundedAt: new Date().toISOString(),
    mode: "self-serve",
  };
}

export async function adminFundDemoWallet(input: {
  redis: Redis;
  body: DemoFaucetRequestBody;
  requesterIp: string | null;
  adminToken: string | undefined;
}): Promise<DemoFaucetRequestDto> {
  assertDemoFaucetAvailable();
  assertAdminTokenMatches(input.adminToken);

  const requestedAddress = resolveFundingAddress({
    body: input.body,
    auth: null,
    mode: "admin",
  });

  await enforceRateLimit({
    redis: input.redis,
    address: requestedAddress,
    requesterIp: input.requesterIp,
    mode: "admin",
  });

  const result = await executeFundingTransfer(requestedAddress);

  return {
    requestedAddress,
    chainId: env.DEMO_FAUCET_CHAIN_ID!,
    amount: env.DEMO_FAUCET_AMOUNT!,
    txHash: result.txHash,
    fundedAt: new Date().toISOString(),
    mode: "admin",
  };
}
