export type StoredGeneratedArtifactMetadata = {
  artifactId: string;
  taskRunId: string;
  orderId: string | null;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  source: "tool" | "llm" | "delivery_bundle";
  toolName: string | null;
  storedFileName: string;
  createdAt: string;
};

export type GeneratedArtifactDto = {
  artifactId: string;
  taskRunId: string;
  orderId: string | null;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  source: "tool" | "llm" | "delivery_bundle";
  toolName: string | null;
  url: string;
  createdAt: string;
};
