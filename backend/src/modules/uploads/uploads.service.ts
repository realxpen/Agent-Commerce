import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyRequest } from "fastify";
import mammoth from "mammoth";

import { env } from "../../config/env.js";
import { createHttpError } from "../../utils/http-error.js";
import type { UploadReferenceFileBody } from "./uploads.schemas.js";
import type { StoredUploadMetadata, UploadedReferenceFileDto } from "./uploads.types.js";

const TEXT_PREVIEW_MAX_CHARS = 12_000;

function sanitizeFileName(fileName: string) {
  const normalized = path.basename(fileName).replace(/[^\w.\-() ]+/g, "-").trim();
  return normalized.length > 0 ? normalized.slice(0, 180) : "upload.bin";
}

function stripDataUrlPrefix(dataBase64: string) {
  const marker = "base64,";
  const markerIndex = dataBase64.indexOf(marker);

  return markerIndex >= 0 ? dataBase64.slice(markerIndex + marker.length) : dataBase64;
}

function inferReferenceType(fileName: string, contentType: string | null) {
  if (contentType?.startsWith("audio/")) {
    return "audio" as const;
  }

  if (contentType?.startsWith("image/")) {
    return "image" as const;
  }

  if (contentType?.startsWith("video/")) {
    return "video" as const;
  }

  const extension = path.extname(fileName).toLowerCase();
  if ([".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac"].includes(extension)) {
    return "audio" as const;
  }

  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(extension)) {
    return "image" as const;
  }

  if ([".mp4", ".mov", ".avi", ".webm", ".mkv"].includes(extension)) {
    return "video" as const;
  }

  return "document" as const;
}

function canExtractTextPreview(fileName: string, contentType: string | null) {
  if (contentType?.startsWith("text/")) {
    return true;
  }

  return [
    ".txt",
    ".md",
    ".markdown",
    ".json",
    ".csv",
    ".tsv",
    ".html",
    ".xml",
    ".yaml",
    ".yml",
  ].includes(path.extname(fileName).toLowerCase());
}

function isDocxFile(fileName: string, contentType: string | null) {
  return (
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    path.extname(fileName).toLowerCase() === ".docx"
  );
}

async function extractPreviewText(
  buffer: Buffer,
  fileName: string,
  contentType: string | null,
) {
  if (isDocxFile(fileName, contentType)) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.replace(/\0/g, "").trim();
      return text.length > 0 ? text.slice(0, TEXT_PREVIEW_MAX_CHARS) : null;
    } catch {
      return null;
    }
  }

  if (!canExtractTextPreview(fileName, contentType)) {
    return null;
  }

  const text = buffer.toString("utf8").replace(/\0/g, "").trim();
  if (text.length === 0) {
    return null;
  }

  return text.slice(0, TEXT_PREVIEW_MAX_CHARS);
}

function getUploadsRoot() {
  return path.resolve(process.cwd(), env.UPLOAD_STORAGE_DIR);
}

function getUploadFolder(uploadId: string) {
  return path.join(getUploadsRoot(), uploadId);
}

function getMetadataPath(uploadId: string) {
  return path.join(getUploadFolder(uploadId), "meta.json");
}

function buildUploadUrl(request: FastifyRequest, uploadId: string) {
  if (env.BACKEND_PUBLIC_BASE_URL) {
    return `${env.BACKEND_PUBLIC_BASE_URL}${env.API_PREFIX}/uploads/${uploadId}`;
  }

  const host = request.headers.host ?? `localhost:${env.PORT}`;
  return `${request.protocol}://${host}${env.API_PREFIX}/uploads/${uploadId}`;
}

function toDto(request: FastifyRequest, metadata: StoredUploadMetadata): UploadedReferenceFileDto {
  return {
    uploadId: metadata.uploadId,
    fileName: metadata.fileName,
    contentType: metadata.contentType,
    sizeBytes: metadata.sizeBytes,
    referenceType: metadata.referenceType,
    url: buildUploadUrl(request, metadata.uploadId),
    previewText: metadata.previewText,
  };
}

export async function uploadReferenceFile(
  request: FastifyRequest,
  input: UploadReferenceFileBody,
): Promise<UploadedReferenceFileDto> {
  const uploadId = crypto.randomUUID().replace(/-/g, "");
  const sanitizedFileName = sanitizeFileName(input.fileName);
  const dataBase64 = stripDataUrlPrefix(input.dataBase64);

  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(dataBase64, "base64");
  } catch {
    throw createHttpError(400, "Uploaded file payload is not valid base64");
  }

  if (fileBuffer.length === 0) {
    throw createHttpError(400, "Uploaded file is empty");
  }

  if (fileBuffer.length > env.UPLOAD_MAX_BYTES) {
    throw createHttpError(
      413,
      `Uploaded file exceeds the ${Math.round(env.UPLOAD_MAX_BYTES / (1024 * 1024))} MB limit`,
    );
  }

  const contentType = input.contentType?.trim() || null;
  const uploadFolder = getUploadFolder(uploadId);
  const storedFileName = sanitizedFileName;
  const filePath = path.join(uploadFolder, storedFileName);
  const previewText = await extractPreviewText(
    fileBuffer,
    sanitizedFileName,
    contentType,
  );
  const metadata: StoredUploadMetadata = {
    uploadId,
    fileName: sanitizedFileName,
    contentType,
    sizeBytes: fileBuffer.length,
    referenceType: inferReferenceType(sanitizedFileName, contentType),
    previewText,
    storedFileName,
    createdAt: new Date().toISOString(),
  };

  await mkdir(uploadFolder, { recursive: true });
  await writeFile(filePath, fileBuffer);
  await writeFile(getMetadataPath(uploadId), JSON.stringify(metadata, null, 2), "utf8");

  return toDto(request, metadata);
}

export async function getUploadedFile(uploadId: string) {
  const { metadata, filePath } = await getUploadedFileMetadata(uploadId);

  return {
    metadata,
    stream: createReadStream(filePath),
  };
}

export async function getUploadedFileBuffer(uploadId: string) {
  const { metadata, filePath } = await getUploadedFileMetadata(uploadId);
  const buffer = await readFile(filePath);

  return {
    metadata,
    buffer,
  };
}

async function getUploadedFileMetadata(uploadId: string) {
  let metadata: StoredUploadMetadata;
  try {
    const rawMetadata = await readFile(getMetadataPath(uploadId), "utf8");
    metadata = JSON.parse(rawMetadata) as StoredUploadMetadata;
  } catch {
    throw createHttpError(404, "Uploaded file not found");
  }

  const filePath = path.join(getUploadFolder(uploadId), metadata.storedFileName);

  try {
    await stat(filePath);
  } catch {
    throw createHttpError(404, "Uploaded file not found");
  }

  return {
    metadata,
    filePath,
  };
}
