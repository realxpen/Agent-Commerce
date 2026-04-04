import { z } from "zod";

const trimmedString = z.string().trim();

export const artifactParamsSchema = z.object({
  artifactId: trimmedString.min(16).max(64),
});

export const artifactQuerySchema = z.object({
  download: trimmedString.optional(),
  meta: trimmedString.optional(),
  preview: z.enum(["html"]).optional(),
});
