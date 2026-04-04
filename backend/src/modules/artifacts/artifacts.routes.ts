import type { FastifyInstance } from "fastify";
import mammoth from "mammoth";

import { getGeneratedArtifact, getGeneratedArtifactFile } from "./artifacts.service.js";
import { artifactParamsSchema, artifactQuerySchema } from "./artifacts.schemas.js";

function isTruthyFlag(value: string | undefined) {
  return value === "1" || value === "true";
}

function looksLikeDocxFile(fileName: string, contentType: string) {
  return (
    /\.docx$/i.test(fileName) ||
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export async function artifactRoutes(app: FastifyInstance) {
  app.get("/:artifactId", async (request, reply) => {
    const { artifactId } = artifactParamsSchema.parse(request.params ?? {});
    const query = artifactQuerySchema.parse(request.query ?? {});
    const preferDownload = isTruthyFlag(query.download);
    const preferMetadata = isTruthyFlag(query.meta);

    if (preferMetadata) {
      const artifactFile = await getGeneratedArtifactFile(artifactId);

      reply.header("cache-control", "no-store");

      return reply.send({
        artifactId: artifactFile.metadata.artifactId,
        title: artifactFile.metadata.title,
        fileName: artifactFile.metadata.fileName,
        contentType: artifactFile.metadata.contentType,
        sizeBytes: artifactFile.metadata.sizeBytes,
        createdAt: artifactFile.metadata.createdAt,
      });
    }

    if (query.preview === "html") {
      const artifactFile = await getGeneratedArtifactFile(artifactId);

      if (
        looksLikeDocxFile(
          artifactFile.metadata.fileName,
          artifactFile.metadata.contentType,
        )
      ) {
        const documentResult = await mammoth.convertToHtml({
          path: artifactFile.filePath,
        });

        reply.header(
          "content-disposition",
          `inline; filename="${artifactFile.metadata.fileName.replace(/"/g, "")}.html"`,
        );
        reply.header("cache-control", "public, max-age=31536000, immutable");
        reply.type("text/html; charset=utf-8");

        return reply.send(documentResult.value);
      }
    }

    const artifact = await getGeneratedArtifact(artifactId);

    reply.header(
      "content-disposition",
      `${preferDownload ? "attachment" : "inline"}; filename="${artifact.metadata.fileName.replace(/"/g, "")}"`,
    );
    reply.header("cache-control", "public, max-age=31536000, immutable");
    reply.type(artifact.metadata.contentType);

    return reply.send(artifact.stream);
  });
}
