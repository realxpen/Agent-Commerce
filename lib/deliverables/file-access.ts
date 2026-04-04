import { getPublicEnv } from "@/lib/env"

type DeliverableProxyMode = "preview" | "download"
export type DeliverableExportFormat = "source" | "html" | "docx" | "pdf" | "xlsx"
type DeliverableMetadata = {
  artifactId?: string
  title?: string | null
  fileName?: string | null
  contentType?: string | null
  sizeBytes?: number | null
  createdAt?: string | null
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getAllowedDeliverableOrigins() {
  const env = getPublicEnv()
  const origins = new Set<string>()
  const configuredOrigin = normalizeOrigin(env.apiBaseUrl)

  if (configuredOrigin) {
    origins.add(configuredOrigin)
  }

  origins.add("http://127.0.0.1:4000")
  origins.add("http://localhost:4000")

  return origins
}

export function getDeliverableExtension(input: {
  fileName?: string | null
  url?: string | null
  formatLabel?: string | null
}) {
  const source = input.fileName ?? input.url ?? ""
  const match = /\.([a-z0-9]+)(?:$|\?)/i.exec(source)

  if (match?.[1]) {
    return match[1].toLowerCase()
  }

  const normalizedFormat = input.formatLabel?.trim().toLowerCase() ?? ""
  return normalizedFormat.length > 0 ? normalizedFormat : null
}

export function inferDeliverableFileName(input: {
  url?: string | null
  fileName?: string | null
  fallbackTitle?: string | null
  formatLabel?: string | null
}) {
  if (input.fileName?.trim()) {
    return input.fileName.trim()
  }

  const safeTitle = input.fallbackTitle?.trim()
  const extension = getDeliverableExtension(input)
  if (!safeTitle) {
    return null
  }

  const slug = safeTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

  if (!slug) {
    return null
  }

  return extension ? `${slug}.${extension}` : slug
}

export function shouldProxyDeliverableUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return false
  }

  try {
    const parsed = new URL(rawUrl)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false
    }

    return getAllowedDeliverableOrigins().has(parsed.origin)
  } catch {
    return false
  }
}

function buildDeliverableProxyUrl(
  rawUrl: string | null | undefined,
  mode: DeliverableProxyMode,
  options?: {
    fileName?: string | null
    formatLabel?: string | null
    exportFormat?: DeliverableExportFormat | null
  },
) {
  if (!rawUrl) {
    return null
  }

  if (!shouldProxyDeliverableUrl(rawUrl)) {
    return rawUrl
  }

  const params = new URLSearchParams()
  params.set("url", rawUrl)
  params.set("mode", mode)

  const fileName = options?.fileName?.trim()
  if (fileName) {
    params.set("fileName", fileName)
  }

  const formatLabel = options?.formatLabel?.trim()
  if (formatLabel) {
    params.set("format", formatLabel)
  }

  if (options?.exportFormat && options.exportFormat !== "source") {
    params.set("export", options.exportFormat)
  }

  return `/api/deliverables?${params.toString()}`
}

export function buildDeliverablePreviewUrl(
  rawUrl: string | null | undefined,
  options?: {
    fileName?: string | null
    formatLabel?: string | null
  },
) {
  return buildDeliverableProxyUrl(rawUrl, "preview", options)
}

export function buildDeliverableDownloadUrl(
  rawUrl: string | null | undefined,
  options?: {
    fileName?: string | null
    formatLabel?: string | null
    exportFormat?: DeliverableExportFormat | null
  },
) {
  return buildDeliverableProxyUrl(rawUrl, "download", options)
}

export function buildDeliverableMetaUrl(rawUrl: string | null | undefined) {
  if (!rawUrl || !shouldProxyDeliverableUrl(rawUrl)) {
    return null
  }

  const params = new URLSearchParams()
  params.set("url", rawUrl)
  params.set("meta", "1")
  return `/api/deliverables?${params.toString()}`
}

function getFileNameFromContentDisposition(value: string | null) {
  if (!value) {
    return null
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const basicMatch = /filename=\"?([^\";]+)\"?/i.exec(value)
  return basicMatch?.[1]?.trim() ?? null
}

export async function fetchDeliverableMetadata(rawUrl: string) {
  const metaUrl = buildDeliverableMetaUrl(rawUrl)
  if (!metaUrl) {
    return null
  }

  const response = await fetch(metaUrl, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Metadata lookup returned ${response.status}`)
  }

  return (await response.json()) as DeliverableMetadata
}

export async function downloadDeliverableToDevice(input: {
  rawUrl: string
  fileName?: string | null
  formatLabel?: string | null
  exportFormat?: DeliverableExportFormat | null
}) {
  const downloadUrl =
    buildDeliverableDownloadUrl(input.rawUrl, {
      fileName: input.fileName,
      formatLabel: input.formatLabel,
      exportFormat: input.exportFormat,
    }) ?? input.rawUrl

  const response = await fetch(downloadUrl, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Download returned ${response.status}`)
  }

  const blob = await response.blob()
  const responseFileName =
    getFileNameFromContentDisposition(response.headers.get("content-disposition")) ??
    input.fileName ??
    "deliverable.bin"
  const objectUrl = URL.createObjectURL(blob)

  try {
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = responseFileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}
