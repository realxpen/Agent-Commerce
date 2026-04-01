"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Bot, Database, Loader2 } from "lucide-react"

type WeightsAssetPreviewProps = {
  url: string
  fileName?: string | null
  formatLabel?: string | null
  title: string
  compact?: boolean
}

type WeightsSummary = {
  format: string
  fileSize: number | null
  contentType: string | null
  details: Array<{ label: string; value: string }>
  notes: string[]
}

const textDecoder = new TextDecoder("utf-8")

function getFileExtension(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const match = /\.([a-z0-9]+)(?:$|\?)/i.exec(value)
  return match?.[1]?.toLowerCase() ?? null
}

function formatBytes(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "Unknown"
  }

  const units = ["B", "KB", "MB", "GB", "TB"]
  let current = value
  let unitIndex = 0

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024
    unitIndex += 1
  }

  return `${current.toFixed(current >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function readLittleUint64(view: DataView, offset: number) {
  return Number(view.getBigUint64(offset, true))
}

async function readUrlPrefix(url: string, maxBytes: number) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Artifact returned ${response.status}`)
  }

  const contentType = response.headers.get("content-type")
  const contentLength = response.headers.get("content-length")
  const fileSize = contentLength ? Number.parseInt(contentLength, 10) : null

  if (!response.body) {
    const buffer = await response.arrayBuffer()
    return {
      bytes: new Uint8Array(buffer.slice(0, maxBytes)),
      fileSize,
      contentType,
    }
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read()
      if (done || !value) {
        break
      }

      const remaining = maxBytes - total
      const nextChunk = value.byteLength > remaining ? value.slice(0, remaining) : value
      chunks.push(nextChunk)
      total += nextChunk.byteLength

      if (nextChunk.byteLength < value.byteLength) {
        break
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return { bytes, fileSize, contentType }
}

function parseSafeTensors(bytes: Uint8Array, fileSize: number | null, contentType: string | null) {
  if (bytes.byteLength < 8) {
    throw new Error("SafeTensors header is incomplete.")
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const headerLength = readLittleUint64(view, 0)

  if (bytes.byteLength < headerLength + 8) {
    throw new Error("SafeTensors header is larger than the loaded preview window.")
  }

  const headerText = textDecoder.decode(bytes.slice(8, 8 + headerLength))
  const header = JSON.parse(headerText) as Record<string, { dtype?: string } | unknown>
  const tensorEntries = Object.entries(header).filter(([key]) => key !== "__metadata__")
  const dtypeCounts = new Map<string, number>()

  for (const [, value] of tensorEntries) {
    if (!value || typeof value !== "object") {
      continue
    }

    const dtype = typeof (value as { dtype?: unknown }).dtype === "string" ? (value as { dtype: string }).dtype : "unknown"
    dtypeCounts.set(dtype, (dtypeCounts.get(dtype) ?? 0) + 1)
  }

  const topDtypes = Array.from(dtypeCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([dtype, count]) => `${dtype} (${count})`)

  return {
    format: "SafeTensors",
    fileSize,
    contentType,
    details: [
      { label: "Tensors", value: new Intl.NumberFormat().format(tensorEntries.length) },
      { label: "Header", value: formatBytes(headerLength) },
      { label: "DTypes", value: topDtypes.join(", ") || "Unknown" },
    ],
    notes: [
      ...(header.__metadata__ && typeof header.__metadata__ === "object"
        ? [`Metadata keys: ${Object.keys(header.__metadata__ as Record<string, unknown>).slice(0, 6).join(", ") || "none"}`]
        : []),
    ],
  } satisfies WeightsSummary
}

function parseGguf(bytes: Uint8Array, fileSize: number | null, contentType: string | null) {
  if (bytes.byteLength < 24) {
    throw new Error("GGUF header is incomplete.")
  }

  const magic = textDecoder.decode(bytes.slice(0, 4))
  if (magic !== "GGUF") {
    throw new Error("This file is not a GGUF artifact.")
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const version = view.getUint32(4, true)
  const tensorCount = readLittleUint64(view, 8)
  const metadataCount = readLittleUint64(view, 16)

  return {
    format: "GGUF",
    fileSize,
    contentType,
    details: [
      { label: "Version", value: String(version) },
      { label: "Tensors", value: new Intl.NumberFormat().format(tensorCount) },
      { label: "Metadata", value: new Intl.NumberFormat().format(metadataCount) },
    ],
    notes: ["Parsed directly from the GGUF file header."],
  } satisfies WeightsSummary
}

function parseGenericWeights(
  bytes: Uint8Array,
  extension: string | null,
  fileSize: number | null,
  contentType: string | null,
) {
  const signature = Array.from(bytes.slice(0, 8))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(" ")
    .toUpperCase()

  const zipBacked = bytes[0] === 0x50 && bytes[1] === 0x4b
  const detectedFormat =
    extension === "onnx"
      ? "ONNX"
      : extension
        ? extension.toUpperCase()
        : "Binary"

  return {
    format: detectedFormat,
    fileSize,
    contentType,
    details: [
      { label: "Signature", value: signature || "Unavailable" },
      { label: "Container", value: zipBacked ? "ZIP-backed artifact" : "Raw binary artifact" },
      { label: "Size", value: formatBytes(fileSize) },
    ],
    notes: [
      extension === "onnx"
        ? "This appears to be an ONNX protobuf model."
        : "Detailed tensor metadata is not exposed by this format without a full framework-specific parser.",
    ],
  } satisfies WeightsSummary
}

async function summarizeWeightsAsset(url: string, fileName?: string | null) {
  const extension = getFileExtension(fileName ?? url)
  const prefixSize = extension === "safetensors" ? 1024 * 1024 * 2 : 1024 * 256
  const { bytes, fileSize, contentType } = await readUrlPrefix(url, prefixSize)

  if (extension === "safetensors") {
    return parseSafeTensors(bytes, fileSize, contentType)
  }

  if (extension === "gguf") {
    return parseGguf(bytes, fileSize, contentType)
  }

  return parseGenericWeights(bytes, extension, fileSize, contentType)
}

export function WeightsAssetPreview({
  url,
  fileName,
  formatLabel,
  title,
  compact = false,
}: WeightsAssetPreviewProps) {
  const [summary, setSummary] = useState<WeightsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const extension = useMemo(() => getFileExtension(fileName ?? url), [fileName, url])

  if (!url) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-black/25 p-6">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-3 text-sm leading-7 text-white/55">
          This model artifact does not have a downloadable file attached yet, so there is no binary header to inspect inline.
        </p>
      </div>
    )
  }

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    setSummary(null)
    setError(null)

    summarizeWeightsAsset(url, fileName)
      .then((nextSummary) => {
        if (!mounted) {
          return
        }

        setSummary(nextSummary)
        setIsLoading(false)
      })
      .catch((loadError) => {
        if (!mounted) {
          return
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "This model artifact could not be inspected inline."
        setError(message)
        setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [fileName, url])

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(244,63,94,0.12),rgba(255,255,255,0.02))] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
            <Bot className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              Real artifact inspection
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-white/55">
              This panel reads real metadata from the delivered weights file instead of showing generic placeholders.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[20px] border border-white/10 bg-black/25 p-5">
          {isLoading ? (
            <div className="flex min-h-[160px] items-center justify-center text-sm text-white/55">
              <Loader2 className="mr-3 h-4 w-4 animate-spin" />
              Inspecting artifact header...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/8 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-rose-300" />
                <div>
                  <p className="text-sm font-semibold text-rose-200">Inline artifact inspection failed</p>
                  <p className="mt-2 text-sm leading-7 text-white/55">{error}</p>
                </div>
              </div>
            </div>
          ) : summary ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Format</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {summary.format || formatLabel || extension?.toUpperCase() || "Binary"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">File size</p>
                  <p className="mt-2 text-base font-semibold text-white">{formatBytes(summary.fileSize)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Content type</p>
                  <p className="mt-2 truncate text-base font-semibold text-white">
                    {summary.contentType ?? "Unknown"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {summary.details.map((detail) => (
                  <div key={detail.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                      {detail.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{detail.value}</p>
                  </div>
                ))}
              </div>

              {summary.notes.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                    <Database className="h-3.5 w-3.5" />
                    Notes
                  </div>
                  <div className="mt-3 space-y-2">
                    {summary.notes.slice(0, compact ? 2 : 4).map((note) => (
                      <p key={note} className="text-sm leading-7 text-white/55">
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
