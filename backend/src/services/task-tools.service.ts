import type { TaskRunRecord } from "../modules/ai-tasks/ai-tasks.types.js";
import {
  createGeneratedArtifact,
} from "../modules/artifacts/artifacts.service.js";
import type { GeneratedArtifactDto } from "../modules/artifacts/artifacts.types.js";
import {
  getServiceExecutionModeFromTaskInput,
  type ServiceExecutionMode,
} from "../modules/services/service-execution.js";
import { logger } from "../lib/logger.js";
import type { TaskExecutionConfig, TaskToolName } from "./llm/llm.types.js";
import {
  runGuardedCodeRunner,
  runImageGenerationTool,
  type ToolArtifactDraft,
} from "./tool-runtime.service.js";

const MAX_CANDIDATE_URLS = 3;
const MAX_REFERENCE_DIGESTS = 4;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_FETCH_TEXT_CHARS = 12_000;
const MAX_RESULT_SUMMARY_CHARS = 3_500;
const MAX_PREVIEW_CHARS = 2_400;
const CODE_RUNNER_KEYWORDS = [
  "analyze",
  "analysis",
  "calculate",
  "calculation",
  "chart",
  "compare",
  "csv",
  "dashboard",
  "data",
  "dataset",
  "forecast",
  "json",
  "metrics",
  "report",
  "sheet",
  "spreadsheet",
  "statistics",
  "table",
  "transform",
];
const IMAGE_GENERATION_KEYWORDS = [
  "ad creative",
  "banner",
  "cover art",
  "design",
  "flyer",
  "hero image",
  "illustration",
  "logo",
  "mockup",
  "photo",
  "poster",
  "render",
  "social post",
  "thumbnail",
  "visual",
];

type TaskToolResult = {
  toolName: TaskToolName;
  title: string;
  summary: string;
  sourceLabel?: string | null;
  url?: string | null;
  excerpt?: string | null;
  artifactUrl?: string | null;
};

export type TaskToolContext = {
  allowedTools: TaskToolName[];
  results: TaskToolResult[];
  artifacts: GeneratedArtifactDto[];
};

type ReferenceInput = {
  type: string;
  label: string;
  url: string;
  note: string | null;
  source: string | null;
  uploadId: string | null;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  previewText: string | null;
};

type RevisionRequestInput = {
  id: string;
  note: string;
  status: string;
  requestedAt: string;
};

type PageSnapshot = {
  url: string;
  hostname: string;
  status: number | null;
  contentType: string | null;
  title: string | null;
  description: string | null;
  excerpt: string | null;
};

type ReferenceDigest = {
  label: string;
  type: string;
  url: string | null;
  note: string | null;
  preview: string | null;
};

const DEFAULT_TOOLS_BY_MODE: Record<ServiceExecutionMode, TaskToolName[]> = {
  text_delivery: ["reference_digest"],
  research_with_links: [
    "web_fetch",
    "page_summary",
    "reference_digest",
    "document_builder",
  ],
  file_generation: [
    "reference_digest",
    "document_builder",
    "file_transformer",
    "code_runner",
    "image_generator",
  ],
  manual_owner_delivery: [],
  hybrid_ai_plus_owner_review: [
    "web_fetch",
    "page_summary",
    "reference_digest",
    "document_builder",
    "code_runner",
    "image_generator",
  ],
};

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "artifact"
  );
}

function isHttpUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function extractHttpUrls(value: string | null) {
  if (!value) {
    return [];
  }

  const matches = value.match(/https?:\/\/[^\s<>"')]+/gi) ?? [];
  return uniqueStrings(matches.map((entry) => entry.trim()));
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtmlToText(value: string) {
  return truncate(
    decodeHtmlEntities(
      value
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]+>/g, " "),
    ),
    MAX_FETCH_TEXT_CHARS,
  );
}

function extractHtmlTitle(value: string) {
  const titleMatch = value.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1] ? truncate(decodeHtmlEntities(titleMatch[1]), 160) : null;
}

function extractHtmlMetaDescription(value: string) {
  const descriptionMatch = value.match(
    /<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]+content=["']([\s\S]*?)["'][^>]*>/i,
  );

  return descriptionMatch?.[1]
    ? truncate(decodeHtmlEntities(descriptionMatch[1]), 320)
    : null;
}

function parseReferenceInputs(taskRun: TaskRunRecord) {
  const input = getRecord(taskRun.input);
  if (!input) {
    return {
      input: null,
      references: [] as ReferenceInput[],
      revisions: [] as RevisionRequestInput[],
    };
  }

  const references = (Array.isArray(input.customerReferences) ? input.customerReferences : [])
    .map((entry) => {
      const reference = getRecord(entry);
      if (!reference) {
        return null;
      }

      const label = getString(reference.label);
      const url = getString(reference.url);
      const type = getString(reference.type);
      if (!label || !url || !type) {
        return null;
      }

      return {
        type,
        label,
        url,
        note: getString(reference.note),
        source: getString(reference.source),
        uploadId: getString(reference.uploadId),
        fileName: getString(reference.fileName),
        contentType: getString(reference.contentType),
        sizeBytes: getNullableNumber(reference.sizeBytes),
        previewText: getString(reference.previewText),
      } satisfies ReferenceInput;
    })
    .filter((reference): reference is ReferenceInput => Boolean(reference));

  const revisions = (Array.isArray(input.revisionRequests) ? input.revisionRequests : [])
    .map((entry) => {
      const revision = getRecord(entry);
      const id = getString(revision?.id);
      const note = getString(revision?.note);
      const status = getString(revision?.status);
      const requestedAt = getString(revision?.requestedAt);

      if (!id || !note || !status || !requestedAt) {
        return null;
      }

      return {
        id,
        note,
        status,
        requestedAt,
      } satisfies RevisionRequestInput;
    })
    .filter((revision): revision is RevisionRequestInput => Boolean(revision));

  return {
    input,
    references,
    revisions,
  };
}

function resolveAllowedTools(
  mode: ServiceExecutionMode,
  config: TaskExecutionConfig,
) {
  const explicitTools = Array.isArray(config.allowedTools)
    ? config.allowedTools.filter((tool, index, tools) => tools.indexOf(tool) === index)
    : null;

  return explicitTools && explicitTools.length > 0
    ? explicitTools
    : DEFAULT_TOOLS_BY_MODE[mode];
}

function collectCandidateUrls(input: Record<string, unknown> | null, references: ReferenceInput[]) {
  const referenceUrls = references
    .map((reference) => reference.url)
    .filter((url) => isHttpUrl(url));
  const noteUrls = extractHttpUrls(getString(input?.customerNote));

  return uniqueStrings([...referenceUrls, ...noteUrls]).slice(0, MAX_CANDIDATE_URLS);
}

async function fetchPageSnapshot(url: string): Promise<PageSnapshot | null> {
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "AgentCommerceToolRunner/1.0",
        accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.1",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const contentType = response.headers.get("content-type");
    const isTextLike =
      contentType?.includes("text/") === true ||
      contentType?.includes("application/json") === true ||
      contentType?.includes("application/xhtml+xml") === true;

    const rawBody = isTextLike ? await response.text() : null;
    const excerpt = rawBody
      ? stripHtmlToText(rawBody)
      : null;

    return {
      url,
      hostname,
      status: response.status,
      contentType,
      title: rawBody ? extractHtmlTitle(rawBody) : null,
      description: rawBody ? extractHtmlMetaDescription(rawBody) : null,
      excerpt,
    };
  } catch (error) {
    logger.warn(
      {
        err: error,
        url,
      },
      "Tool runner could not fetch external page",
    );

    return null;
  }
}

function buildPageMetaLabel(page: PageSnapshot) {
  return page.title ?? page.hostname;
}

function buildPageSummary(page: PageSnapshot) {
  const parts = [
    page.description,
    page.excerpt,
  ].filter(Boolean);

  return parts.length > 0
    ? truncate(parts.join(" "), 500)
    : `No text preview was available for ${page.hostname}.`;
}

function buildReferenceDigests(references: ReferenceInput[]) {
  return references
    .filter((reference) => reference.previewText || reference.note)
    .slice(0, MAX_REFERENCE_DIGESTS)
    .map((reference) => ({
      label: reference.label,
      type: reference.type,
      url: isHttpUrl(reference.url) ? reference.url : null,
      note: reference.note,
      preview: reference.previewText
        ? truncate(reference.previewText, MAX_PREVIEW_CHARS)
        : null,
    })) satisfies ReferenceDigest[];
}

function formatBulletList(lines: string[]) {
  return truncate(lines.map((line) => `- ${line}`).join("\n"), MAX_RESULT_SUMMARY_CHARS);
}

function containsKeyword(value: string, keywords: string[]) {
  const haystack = value.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

function getToolIntentText(input: {
  serviceTitle: string;
  customerNote: string | null;
  revisions: RevisionRequestInput[];
}) {
  return [
    input.serviceTitle,
    input.customerNote,
    ...input.revisions.map((revision) => revision.note),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getFileExtension(value: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return "";
  }

  const source = normalized.includes("/")
    ? new URL(normalized, "http://localhost").pathname
    : normalized;
  const extensionMatch = source.match(/(\.[a-z0-9]+)$/i);
  return extensionMatch?.[1]?.toLowerCase() ?? "";
}

function isStructuredReference(reference: ReferenceInput) {
  const contentType = reference.contentType?.toLowerCase() ?? "";
  const extension = getFileExtension(reference.fileName ?? reference.url);
  const preview = reference.previewText?.trim() ?? "";

  return (
    reference.type === "document" ||
    reference.type === "audio" ||
    contentType.includes("json") ||
    contentType.includes("csv") ||
    contentType.includes("xml") ||
    contentType.includes("yaml") ||
    contentType.startsWith("text/") ||
    [
      ".csv",
      ".tsv",
      ".txt",
      ".md",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
      ".xlsx",
      ".xls",
    ].includes(extension) ||
    preview.startsWith("{") ||
    preview.startsWith("[") ||
    preview.includes(",") ||
    preview.includes("|")
  );
}

function isVisualReference(reference: ReferenceInput) {
  const contentType = reference.contentType?.toLowerCase() ?? "";
  const extension = getFileExtension(reference.fileName ?? reference.url);

  return (
    reference.type === "image" ||
    reference.type === "video" ||
    contentType.startsWith("image/") ||
    contentType.startsWith("video/") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".mov"].includes(extension)
  );
}

function shouldRunCodeRunner(input: {
  allowedTools: TaskToolName[];
  hasExplicitAllowedTools: boolean;
  serviceTitle: string;
  customerNote: string | null;
  references: ReferenceInput[];
  revisions: RevisionRequestInput[];
}) {
  if (!input.allowedTools.includes("code_runner")) {
    return false;
  }

  if (input.hasExplicitAllowedTools) {
    return true;
  }

  const intentText = getToolIntentText(input);
  return (
    containsKeyword(intentText, CODE_RUNNER_KEYWORDS) ||
    input.references.some(isStructuredReference)
  );
}

function shouldRunImageGenerator(input: {
  allowedTools: TaskToolName[];
  hasExplicitAllowedTools: boolean;
  serviceTitle: string;
  customerNote: string | null;
  references: ReferenceInput[];
  revisions: RevisionRequestInput[];
}) {
  if (!input.allowedTools.includes("image_generator")) {
    return false;
  }

  if (input.hasExplicitAllowedTools) {
    return true;
  }

  const intentText = getToolIntentText(input);
  return (
    containsKeyword(intentText, IMAGE_GENERATION_KEYWORDS) ||
    input.references.some(isVisualReference)
  );
}

async function persistToolArtifactDrafts(input: {
  taskRun: TaskRunRecord;
  toolName: TaskToolName;
  drafts: ToolArtifactDraft[];
}) {
  return Promise.all(
    input.drafts.map((draft) =>
      createGeneratedArtifact({
        taskRunId: input.taskRun.id,
        orderId: input.taskRun.orderId,
        title: draft.title,
        fileName: draft.fileName,
        contentType: draft.contentType,
        content: draft.content,
        source: "tool",
        toolName: input.toolName,
      }),
    ),
  );
}

async function buildDocumentBuilderArtifact(input: {
  taskRun: TaskRunRecord;
  serviceTitle: string;
  customerNote: string | null;
  pageSnapshots: PageSnapshot[];
  referenceDigests: ReferenceDigest[];
  revisions: RevisionRequestInput[];
}) {
  const markdown = [
    `# ${input.serviceTitle} briefing pack`,
    input.customerNote
      ? `## Customer Brief\n\n${input.customerNote}`
      : "## Customer Brief\n\nNo extra customer brief was attached.",
    input.revisions.length > 0
      ? [
          "## Revision Requests",
          "",
          ...input.revisions.map((revision) =>
            `- [${revision.status}] ${revision.note} (${revision.requestedAt})`,
          ),
        ].join("\n")
      : null,
    input.referenceDigests.length > 0
      ? [
          "## Reference Digests",
          "",
          ...input.referenceDigests.map((reference) =>
            [
              `### ${reference.label}`,
              "",
              `- Type: ${reference.type}`,
              reference.url ? `- URL: ${reference.url}` : null,
              reference.note ? `- Note: ${reference.note}` : null,
              reference.preview ? `- Preview: ${reference.preview}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        ].join("\n\n")
      : null,
    input.pageSnapshots.length > 0
      ? [
          "## External Source Snapshots",
          "",
          ...input.pageSnapshots.map((page) =>
            [
              `### ${buildPageMetaLabel(page)}`,
              "",
              `- URL: ${page.url}`,
              page.status !== null ? `- HTTP Status: ${page.status}` : null,
              page.description ? `- Meta Description: ${page.description}` : null,
              page.excerpt ? `- Excerpt: ${page.excerpt}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        ].join("\n\n")
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return createGeneratedArtifact({
    taskRunId: input.taskRun.id,
    orderId: input.taskRun.orderId,
    title: `${input.serviceTitle} briefing pack`,
    fileName: `${slugify(input.serviceTitle)}-briefing-pack.md`,
    contentType: "text/markdown",
    content: markdown,
    source: "tool",
    toolName: "document_builder",
  });
}

async function buildFileTransformerArtifact(input: {
  taskRun: TaskRunRecord;
  serviceTitle: string;
  references: ReferenceInput[];
  referenceDigests: ReferenceDigest[];
  pageSnapshots: PageSnapshot[];
  revisions: RevisionRequestInput[];
}) {
  const transformedPayload = {
    serviceTitle: input.serviceTitle,
    orderId: input.taskRun.orderId,
    generatedAt: new Date().toISOString(),
    references: input.references.map((reference) => ({
      type: reference.type,
      label: reference.label,
      url: reference.url,
      note: reference.note,
      source: reference.source,
      uploadId: reference.uploadId,
      fileName: reference.fileName,
      contentType: reference.contentType,
      sizeBytes: reference.sizeBytes,
      previewText: reference.previewText
        ? truncate(reference.previewText, MAX_PREVIEW_CHARS)
        : null,
    })),
    referenceDigests: input.referenceDigests,
    pageSnapshots: input.pageSnapshots.map((page) => ({
      url: page.url,
      hostname: page.hostname,
      status: page.status,
      contentType: page.contentType,
      title: page.title,
      description: page.description,
      excerpt: page.excerpt,
    })),
    revisions: input.revisions,
  };

  return createGeneratedArtifact({
    taskRunId: input.taskRun.id,
    orderId: input.taskRun.orderId,
    title: `${input.serviceTitle} source export`,
    fileName: `${slugify(input.serviceTitle)}-source-export.json`,
    contentType: "application/json",
    content: JSON.stringify(transformedPayload, null, 2),
    source: "tool",
    toolName: "file_transformer",
  });
}

export async function executeTaskTools(input: {
  taskRun: TaskRunRecord;
  config: TaskExecutionConfig;
}): Promise<TaskToolContext | null> {
  const { taskRun, config } = input;
  const mode = getServiceExecutionModeFromTaskInput(taskRun.input);
  const hasExplicitAllowedTools = Array.isArray(config.allowedTools) && config.allowedTools.length > 0;
  const allowedTools = resolveAllowedTools(mode, config);

  if (allowedTools.length === 0) {
    return null;
  }

  const { input: taskInput, references, revisions } = parseReferenceInputs(taskRun);
  const serviceTitle =
    getString(taskRun.order?.serviceTitleSnapshot) ??
    getString(taskRun.agentTask.name) ??
    "AgentCommerce service";
  const customerNote = getString(taskInput?.customerNote);
  const providerName = getString(taskRun.agentTask.provider) ?? undefined;

  const shouldFetchPages = allowedTools.some((tool) =>
    tool === "web_fetch" ||
    tool === "page_summary" ||
    tool === "document_builder" ||
    tool === "file_transformer",
  );

  const candidateUrls = shouldFetchPages ? collectCandidateUrls(taskInput, references) : [];
  const pageSnapshots = shouldFetchPages
    ? (
        await Promise.all(candidateUrls.map((url) => fetchPageSnapshot(url)))
      ).filter((page): page is PageSnapshot => Boolean(page))
    : [];

  const referenceDigests = allowedTools.includes("reference_digest") ||
    allowedTools.includes("document_builder") ||
    allowedTools.includes("file_transformer")
      ? buildReferenceDigests(references)
      : [];

  const results: TaskToolResult[] = [];
  const artifacts: GeneratedArtifactDto[] = [];

  if (allowedTools.includes("web_fetch") && pageSnapshots.length > 0) {
    results.push({
      toolName: "web_fetch",
      title: `Fetched ${pageSnapshots.length} external source${pageSnapshots.length === 1 ? "" : "s"}`,
      summary: formatBulletList(
        pageSnapshots.map((page) => {
          const parts = [
            buildPageMetaLabel(page),
            page.status !== null ? `status ${page.status}` : null,
            page.description ?? page.excerpt,
          ].filter(Boolean);

          return parts.join(" - ");
        }),
      ),
      sourceLabel: candidateUrls[0] ? new URL(candidateUrls[0]).hostname : null,
    });
  }

  if (allowedTools.includes("page_summary") && pageSnapshots.length > 0) {
    results.push({
      toolName: "page_summary",
      title: `Prepared ${pageSnapshots.length} page summary${pageSnapshots.length === 1 ? "" : "ies"}`,
      summary: formatBulletList(
        pageSnapshots.map((page) => `${buildPageMetaLabel(page)} - ${buildPageSummary(page)}`),
      ),
    });
  }

  if (allowedTools.includes("reference_digest") && referenceDigests.length > 0) {
    results.push({
      toolName: "reference_digest",
      title: `Digested ${referenceDigests.length} customer material${referenceDigests.length === 1 ? "" : "s"}`,
      summary: formatBulletList(
        referenceDigests.map((reference) =>
          [
            `${reference.label} (${reference.type})`,
            reference.note,
            reference.preview,
          ]
            .filter(Boolean)
            .join(" - "),
        ),
      ),
    });
  }

  if (
    shouldRunCodeRunner({
      allowedTools,
      hasExplicitAllowedTools,
      serviceTitle,
      customerNote,
      references,
      revisions,
    })
  ) {
    const runtimeResult = await runGuardedCodeRunner({
      providerName,
      serviceTitle,
      customerNote,
      references,
      revisions,
    });

    if (runtimeResult) {
      const generatedArtifacts = await persistToolArtifactDrafts({
        taskRun,
        toolName: "code_runner",
        drafts: runtimeResult.artifactDrafts,
      });

      artifacts.push(...generatedArtifacts);
      results.push({
        toolName: "code_runner",
        title: "Ran guarded code execution",
        summary:
          runtimeResult.summary ??
          "Generated computed analysis outputs from structured customer materials using the guarded code execution path.",
        artifactUrl: generatedArtifacts[0]?.url ?? null,
        url: generatedArtifacts[0]?.url ?? null,
      });
    }
  }

  if (
    shouldRunImageGenerator({
      allowedTools,
      hasExplicitAllowedTools,
      serviceTitle,
      customerNote,
      references,
      revisions,
    })
  ) {
    const runtimeResult = await runImageGenerationTool({
      providerName,
      serviceTitle,
      customerNote,
      references,
      revisions,
    });

    if (runtimeResult) {
      const generatedArtifacts = await persistToolArtifactDrafts({
        taskRun,
        toolName: "image_generator",
        drafts: runtimeResult.artifactDrafts,
      });

      artifacts.push(...generatedArtifacts);
      results.push({
        toolName: "image_generator",
        title: `Generated ${generatedArtifacts.length > 0 ? generatedArtifacts.length : 1} visual artifact${generatedArtifacts.length === 1 ? "" : "s"}`,
        summary:
          runtimeResult.summary ??
          "Generated a downloadable visual asset for this order using the configured image provider.",
        artifactUrl: generatedArtifacts[0]?.url ?? null,
        url: generatedArtifacts[0]?.url ?? null,
      });
    }
  }

  if (allowedTools.includes("document_builder")) {
    const artifact = await buildDocumentBuilderArtifact({
      taskRun,
      serviceTitle,
      customerNote,
      pageSnapshots,
      referenceDigests,
      revisions,
    });

    artifacts.push(artifact);
    results.push({
      toolName: "document_builder",
      title: "Built a source briefing artifact",
      summary:
        "Created a markdown briefing pack that combines the customer brief, revision context, uploaded references, and external source snapshots.",
      artifactUrl: artifact.url,
      url: artifact.url,
    });
  }

  if (allowedTools.includes("file_transformer")) {
    const artifact = await buildFileTransformerArtifact({
      taskRun,
      serviceTitle,
      references,
      referenceDigests,
      pageSnapshots,
      revisions,
    });

    artifacts.push(artifact);
    results.push({
      toolName: "file_transformer",
      title: "Built a normalized source export",
      summary:
        "Created a structured JSON export of the order references, digests, and fetched page snapshots for downstream processing or delivery.",
      artifactUrl: artifact.url,
      url: artifact.url,
    });
  }

  if (results.length === 0 && artifacts.length === 0) {
    return {
      allowedTools,
      results: [],
      artifacts: [],
    };
  }

  return {
    allowedTools,
    results,
    artifacts,
  };
}
