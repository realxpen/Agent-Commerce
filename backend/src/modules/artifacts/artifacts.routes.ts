import type { FastifyInstance } from "fastify";

import { getGeneratedArtifact } from "./artifacts.service.js";
import { artifactParamsSchema } from "./artifacts.schemas.js";

export async function artifactRoutes(app: FastifyInstance) {
  app.get("/:artifactId", async (request, reply) => {
    const { artifactId } = artifactParamsSchema.parse(request.params ?? {});
    const artifact = await getGeneratedArtifact(artifactId);

    reply.header(
      "content-disposition",
      `inline; filename="${artifact.metadata.fileName.replace(/"/g, "")}"`,
    );
    reply.header("cache-control", "public, max-age=31536000, immutable");
    reply.type(artifact.metadata.contentType);

    return reply.send(artifact.stream);
  });
}
