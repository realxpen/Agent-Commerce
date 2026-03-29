export type UploadedReferenceFileDto = {
  uploadId: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number;
  referenceType: "image" | "video" | "audio" | "document";
  url: string;
  previewText: string | null;
};

export type StoredUploadMetadata = {
  uploadId: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number;
  referenceType: "image" | "video" | "audio" | "document";
  previewText: string | null;
  storedFileName: string;
  createdAt: string;
};
