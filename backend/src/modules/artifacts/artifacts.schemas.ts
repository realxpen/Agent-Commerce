import { z } from "zod";

const trimmedString = z.string().trim();

export const artifactParamsSchema = z.object({
  artifactId: trimmedString.min(16).max(64),
});
