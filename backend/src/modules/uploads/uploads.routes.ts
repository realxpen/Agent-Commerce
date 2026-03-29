import type { FastifyInstance } from "fastify";

import { env } from "../../config/env.js";
import { getUploadedFile, uploadReferenceFile } from "./uploads.service.js";
import { uploadParamsSchema, uploadReferenceFileBodySchema } from "./uploads.schemas.js";

export async function uploadRoutes(app: FastifyInstance) {
  app.post(
    "/",
    {
      preHandler: app.authenticate,
      bodyLimit: Math.ceil(env.UPLOAD_MAX_BYTES * 1.5) + 4096,
    },
    async (request, reply) => {
      const body = uploadReferenceFileBodySchema.parse(request.body ?? {});
      const upload = await uploadReferenceFile(request, body);

      reply.status(201);
      return {
        data: upload,
      };
    },
  );

  app.get("/:uploadId", async (request, reply) => {
    const { uploadId } = uploadParamsSchema.parse(request.params ?? {});
    const uploadedFile = await getUploadedFile(uploadId);

    reply.header(
      "content-disposition",
      `inline; filename="${uploadedFile.metadata.fileName.replace(/"/g, "")}"`,
    );
    reply.header("cache-control", "public, max-age=31536000, immutable");
    reply.type(uploadedFile.metadata.contentType ?? "application/octet-stream");

    return reply.send(uploadedFile.stream);
  });
}
