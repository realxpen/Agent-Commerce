import { NextRequest, NextResponse } from "next/server"
import { fromHex, toBech32 } from "@cosmjs/encoding"
import { getPublicEnv } from "@/lib/env"

export const dynamic = "force-dynamic"
const APPCHAIN_BECH32_PREFIX = "init"

function getUpstreamRestBaseUrl() {
  const env = getPublicEnv()
  return env.appchainRestUrl.replace(/\/+$/, "")
}

function convertHexAddressToBech32(value: string) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    return value
  }

  try {
    return toBech32(APPCHAIN_BECH32_PREFIX, fromHex(value.slice(2)))
  } catch {
    return value
  }
}

function normalizePathSegments(pathSegments: string[]) {
  if (
    pathSegments.length >= 5 &&
    pathSegments[0] === "cosmos" &&
    pathSegments[1] === "auth" &&
    pathSegments[2] === "v1beta1" &&
    (pathSegments[3] === "account_info" || pathSegments[3] === "accounts")
  ) {
    const normalized = [...pathSegments]
    normalized[4] = convertHexAddressToBech32(normalized[4] ?? "")
    return normalized
  }

  return pathSegments
}

function buildUpstreamUrl(request: NextRequest, pathSegments: string[]) {
  const upstreamBaseUrl = getUpstreamRestBaseUrl()
  const upstreamPath = normalizePathSegments(pathSegments).join("/")
  const search = request.nextUrl.search

  return `${upstreamBaseUrl}/${upstreamPath}${search}`
}

function buildUpstreamHeaders(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.delete("connection")
  headers.delete("content-length")
  headers.delete("accept-encoding")
  return headers
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const params = await context.params
  const pathSegments = params.path ?? []
  const upstreamUrl = buildUpstreamUrl(request, pathSegments)
  const method = request.method.toUpperCase()
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer()
  let upstreamResponse: Response

  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers: buildUpstreamHeaders(request),
      body,
      redirect: "follow",
      cache: "no-store",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Appchain REST proxy request failed",
        upstreamUrl,
        details: error instanceof Error ? error.message : "Unknown fetch error",
      },
      {
        status: 502,
      },
    )
  }

  const responseHeaders = new Headers(upstreamResponse.headers)
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("content-length")
  responseHeaders.set("cache-control", "no-store")

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, context)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, context)
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, context)
}
