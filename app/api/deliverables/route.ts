import { NextRequest, NextResponse } from "next/server"
import { getPublicEnv } from "@/lib/env"

export const dynamic = "force-dynamic"

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

function getAllowedOrigins() {
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

function sanitizeFileName(value: string | null | undefined) {
  const fallback = "deliverable.bin"
  if (!value) {
    return fallback
  }

  const normalized = value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()

  return normalized.length > 0 ? normalized.slice(0, 180) : fallback
}

function inferExtension(input: {
  fileName?: string | null
  rawUrl?: string | null
  format?: string | null
}) {
  const source = input.fileName ?? input.rawUrl ?? ""
  const match = /\.([a-z0-9]+)(?:$|\?)/i.exec(source)
  if (match?.[1]) {
    return match[1].toLowerCase()
  }

  return input.format?.trim().toLowerCase() ?? null
}

function isArtifactUrl(url: URL) {
  return /\/artifacts\/[^/]+$/i.test(url.pathname)
}

function isAllowedTarget(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false
    }

    return getAllowedOrigins().has(parsed.origin)
  } catch {
    return false
  }
}

function buildUpstreamUrl(input: {
  rawUrl: string
  mode: "preview" | "download"
  fileName?: string | null
  format?: string | null
}) {
  const upstream = new URL(input.rawUrl)
  const extension = inferExtension({
    fileName: input.fileName,
    rawUrl: input.rawUrl,
    format: input.format,
  })

  if (isArtifactUrl(upstream)) {
    if (input.mode === "download") {
      upstream.searchParams.set("download", "1")
    }

    if (input.mode === "preview" && extension === "docx") {
      upstream.searchParams.set("preview", "html")
    }
  }

  return upstream.toString()
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")
  const mode = request.nextUrl.searchParams.get("mode") === "download" ? "download" : "preview"
  const fileName = sanitizeFileName(request.nextUrl.searchParams.get("fileName"))
  const format = request.nextUrl.searchParams.get("format")

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing deliverable URL." },
      { status: 400 },
    )
  }

  if (!isAllowedTarget(rawUrl)) {
    return NextResponse.json(
      { error: "This deliverable source is not allowed through the file proxy." },
      { status: 403 },
    )
  }

  const upstreamUrl = buildUpstreamUrl({
    rawUrl,
    mode,
    fileName,
    format,
  })

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      cache: "no-store",
      redirect: "follow",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Deliverable proxy request failed.",
        upstreamUrl,
        details: error instanceof Error ? error.message : "Unknown fetch error",
      },
      { status: 502 },
    )
  }

  const responseHeaders = new Headers(upstreamResponse.headers)
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("content-length")
  responseHeaders.delete("content-security-policy")
  responseHeaders.delete("x-frame-options")
  responseHeaders.set("cache-control", "no-store")

  if (mode === "download") {
    responseHeaders.set(
      "content-disposition",
      `attachment; filename="${fileName.replace(/"/g, "")}"`,
    )
  } else if (!responseHeaders.has("content-disposition")) {
    responseHeaders.set(
      "content-disposition",
      `inline; filename="${fileName.replace(/"/g, "")}"`,
    )
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}
