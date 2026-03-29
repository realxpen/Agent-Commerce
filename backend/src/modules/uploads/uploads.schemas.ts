import { z } from "zod";

const trimmedString = z.string().trim();

export const uploadReferenceFileBodySchema = z.object({
  fileName: trimmedString.min(1).max(255),
  contentType: trimmedString.min(1).max(255).nullable().optional(),
  dataBase64: trimmedString.min(1),
});

export const uploadParamsSchema = z.object({
  uploadId: trimmedString.min(16).max(64),
});

export type UploadReferenceFileBody = z.infer<typeof uploadReferenceFileBodySchema>;
