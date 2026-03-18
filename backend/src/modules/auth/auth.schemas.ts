import { z } from "zod";

const trimmedString = z.string().trim();

export const authChallengeBodySchema = z.object({
  address: trimmedString.min(3).max(128),
  chainId: trimmedString.min(1).max(128),
  algo: z.enum(["secp256k1", "ethsecp256k1"]).optional().default("secp256k1"),
});

export const verifyWalletAuthBodySchema = z.object({
  address: trimmedString.min(3).max(128),
  chainId: trimmedString.min(1).max(128),
  nonce: trimmedString.min(16).max(128),
  signature: trimmedString.min(16).max(2048),
  publicKey: trimmedString.min(16).max(2048),
  algo: z.enum(["secp256k1", "ethsecp256k1"]).optional().default("secp256k1"),
});

export type AuthChallengeBody = z.infer<typeof authChallengeBodySchema>;
export type VerifyWalletAuthBody = z.infer<typeof verifyWalletAuthBodySchema>;
