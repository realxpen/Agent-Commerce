import { getPublicEnv } from "@/lib/env"

type DeliverableProxyMode = "preview" | "download"

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

  if (input.url) {
    try {
      const parsed = new URL(input.url)
      const lastSegment = parsed.pathname.split("/").pop()?.trim()
      if (lastSegment) {
        return decodeURIComponent(lastSegment)
      }
    } catch {
      const lastSegment = input.url.split("/").pop()?.split("?")[0]?.trim()
      if (lastSegment) {
        return lastSegment
      }
    }
  }

  const safeTitle = input.fallbackTitle?.trim()
  const extension = getDeliverableExtension(input)
  if (!safeTitle) {
    return extension ? `deliverable.${extension}` : "deliverable.bin"
  }

  const slug = safeTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

  if (!slug) {
    return extension ? `deliverable.${extension}` : "deliverable.bin"
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

  const fileName = inferDeliverableFileName({
    url: rawUrl,
    fileName: options?.fileName ?? null,
    formatLabel: options?.formatLabel ?? null,
  })
  if (fileName) {
    params.set("fileName", fileName)
  }

  const formatLabel = options?.formatLabel?.trim()
  if (formatLabel) {
    params.set("format", formatLabel)
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
  },
) {
  return buildDeliverableProxyUrl(rawUrl, "download", options)
}
