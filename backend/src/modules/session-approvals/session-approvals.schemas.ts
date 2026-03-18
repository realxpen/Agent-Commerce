import { z } from "zod";

const trimmedString = z.string().trim();

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const autoSignSessionQuerySchema = z.object({
  chainId: trimmedString.min(1).max(128).optional(),
});

export const syncAutoSignSessionBodySchema = z.object({
  chainId: trimmedString.min(1).max(128).optional(),
  grantee: trimmedString.min(1).max(256).optional(),
  expiresAt: z.string().datetime().optional(),
  scope: jsonRecordSchema.optional(),
  metadata: jsonRecordSchema.optional(),
});

export const revokeAutoSignSessionBodySchema = z.object({
  chainId: trimmedString.min(1).max(128).optional(),
  metadata: jsonRecordSchema.optional(),
});

export const markAutoSignSessionUsedBodySchema = z.object({
  chainId: trimmedString.min(1).max(128).optional(),
  surface: trimmedString.min(1).max(64).optional(),
  metadata: jsonRecordSchema.optional(),
});

export type AutoSignSessionQuery = z.infer<typeof autoSignSessionQuerySchema>;
export type SyncAutoSignSessionBody = z.infer<typeof syncAutoSignSessionBodySchema>;
export type RevokeAutoSignSessionBody = z.infer<typeof revokeAutoSignSessionBodySchema>;
export type MarkAutoSignSessionUsedBody = z.infer<typeof markAutoSignSessionUsedBodySchema>;
