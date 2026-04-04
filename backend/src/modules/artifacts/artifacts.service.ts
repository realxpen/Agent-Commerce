import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env.js";
import { createHttpError } from "../../utils/http-error.js";
import type {
  GeneratedArtifactDto,
  StoredGeneratedArtifactMetadata,
} from "./artifacts.types.js";

function sanitizeFileName(fileName: string) {
  const normalized = path.basename(fileName).replace(/[^\w.\-() ]+/g, "-").trim();
  return normalized.length > 0 ? normalized.slice(0, 180) : "artifact.bin";
}

function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "artifact";
}

function ensureFileExtension(fileName: string, contentType: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension) {
    return fileName;
  }

  switch (contentType) {
    case "text/markdown":
      return `${fileName}.md`;
    case "application/json":
      return `${fileName}.json`;
    case "text/plain":
      return `${fileName}.txt`;
    default:
      return `${fileName}.bin`;
  }
}

function getArtifactsRoot() {
  return path.resolve(process.cwd(), env.ARTIFACT_STORAGE_DIR);
}

function getArtifactFolder(artifactId: string) {
  return path.join(getArtifactsRoot(), artifactId);
}

function getMetadataPath(artifactId: string) {
  return path.join(getArtifactFolder(artifactId), "meta.json");
}

function buildArtifactUrl(artifactId: string) {
  return `${env.BACKEND_PUBLIC_BASE_URL}${env.API_PREFIX}/artifacts/${artifactId}`;
}

function toDto(metadata: StoredGeneratedArtifactMetadata): GeneratedArtifactDto {
  return {
    artifactId: metadata.artifactId,
    taskRunId: metadata.taskRunId,
    orderId: metadata.orderId,
    title: metadata.title,
    fileName: metadata.fileName,
    contentType: metadata.contentType,
    sizeBytes: metadata.sizeBytes,
    source: metadata.source,
    toolName: metadata.toolName,
    url: buildArtifactUrl(metadata.artifactId),
    createdAt: metadata.createdAt,
  };
}

export async function createGeneratedArtifact(input: {
  taskRunId: string;
  orderId?: string | null;
  title: string;
  fileName?: string | null;
  contentType: string;
  content: string | Buffer;
  source: "tool" | "llm" | "delivery_bundle";
  toolName?: string | null;
}) {
  const artifactId = crypto.randomUUID().replace(/-/g, "");
  const suggestedFileName = input.fileName?.trim().length
    ? input.fileName.trim()
    : slugifyTitle(input.title);
  const sanitizedFileName = ensureFileExtension(
    sanitizeFileName(suggestedFileName),
    input.contentType,
  );
  const contentBuffer =
    typeof input.content === "string"
      ? Buffer.from(input.content, "utf8")
      : input.content;
  const artifactFolder = getArtifactFolder(artifactId);
  const storedFileName = sanitizedFileName;
  const filePath = path.join(artifactFolder, storedFileName);

  const metadata: StoredGeneratedArtifactMetadata = {
    artifactId,
    taskRunId: input.taskRunId,
    orderId: input.orderId ?? null,
    title: input.title,
    fileName: sanitizedFileName,
    contentType: input.contentType,
    sizeBytes: contentBuffer.length,
    source: input.source,
    toolName: input.toolName ?? null,
    storedFileName,
    createdAt: new Date().toISOString(),
  };

  await mkdir(artifactFolder, { recursive: true });
  await writeFile(filePath, contentBuffer);
  await writeFile(getMetadataPath(artifactId), JSON.stringify(metadata, null, 2), "utf8");

  return toDto(metadata);
}

export async function getGeneratedArtifact(artifactId: string) {
  const { metadata, filePath } = await getGeneratedArtifactMetadata(artifactId);

  return {
    metadata,
    stream: createReadStream(filePath),
  };
}

export async function getGeneratedArtifactFile(artifactId: string) {
  return getGeneratedArtifactMetadata(artifactId);
}

async function getGeneratedArtifactMetadata(artifactId: string) {
  let metadata: StoredGeneratedArtifactMetadata;
  try {
    const rawMetadata = await readFile(getMetadataPath(artifactId), "utf8");
    metadata = JSON.parse(rawMetadata) as StoredGeneratedArtifactMetadata;
  } catch {
    throw createHttpError(404, "Generated artifact not found");
  }

  const filePath = path.join(getArtifactFolder(artifactId), metadata.storedFileName);

  try {
    await stat(filePath);
  } catch {
    throw createHttpError(404, "Generated artifact not found");
  }

  return {
    metadata,
    filePath,
  };
}
