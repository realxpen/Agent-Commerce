import { z } from "zod";

const trimmedString = z.string().trim();
const walletAuthMethodSchema = z.enum(["adr36", "eip191"]);

const adr36SignDocSchema = z.object({
  chain_id: z.string(),
  account_number: z.string(),
  sequence: z.string(),
  fee: z.object({
    gas: z.string(),
    amount: z.array(
      z.object({
        denom: z.string(),
        amount: z.string(),
      }),
    ),
  }),
  msgs: z.array(
    z.object({
      type: z.string(),
      value: z.object({
        signer: z.string(),
        data: z.string(),
      }),
    }),
  ),
  memo: z.string(),
});

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
  publicKey: trimmedString.min(16).max(2048).optional(),
  algo: z.enum(["secp256k1", "ethsecp256k1"]).optional().default("secp256k1"),
  method: walletAuthMethodSchema.optional().default("adr36"),
  signDoc: adr36SignDocSchema.optional(),
}).superRefine((body, ctx) => {
  if (body.method !== "eip191" && !body.publicKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["publicKey"],
      message: "publicKey is required for ADR-36 verification",
    });
  }
});

export type AuthChallengeBody = z.infer<typeof authChallengeBodySchema>;
export type VerifyWalletAuthBody = z.infer<typeof verifyWalletAuthBodySchema>;
