"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bot,
  Box,
  Code,
  Database,
  Download,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  Music,
  PlayCircle,
  Presentation,
  ScrollText,
  Table2,
  Video,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DocumentAssetPreview } from "@/components/deliverables/DocumentAssetPreview"
import { ModelAssetPreview } from "@/components/deliverables/ModelAssetPreview"
import { PresentationAssetPreview } from "@/components/deliverables/PresentationAssetPreview"
import { WeightsAssetPreview } from "@/components/deliverables/WeightsAssetPreview"
import {
  buildDeliverableDownloadUrl,
  buildDeliverablePreviewUrl,
  inferDeliverableFileName,
} from "@/lib/deliverables/file-access"
import { cn } from "@/lib/utils"

export type PreviewAssetType =
  | "document"
  | "code"
  | "contract"
  | "design"
  | "data"
  | "spreadsheet"
  | "presentation"
  | "model"
  | "deployment"
  | "weights"
  | "video"
  | "audio"

export type DeliverablePreviewItem = {
  title: string
  description?: string | null
  type: PreviewAssetType
  formatLabel: string
  previewUrl: string | null
  downloadUrl: string | null
  fileName?: string | null
  subtitle?: string | null
  agentName?: string | null
  sourceLabel?: string | null
  dateLabel?: string | null
  sizeLabel?: string | null
}

const typeMeta = {
  document: {
    icon: FileText,
    className: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },
  code: {
    icon: Code,
    className: "border-purple-500/20 bg-purple-500/10 text-purple-300",
  },
  contract: {
    icon: ScrollText,
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  design: {
    icon: ImageIcon,
    className: "border-pink-500/20 bg-pink-500/10 text-pink-300",
  },
  data: {
    icon: Database,
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  spreadsheet: {
    icon: Table2,
    className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  },
  presentation: {
    icon: Presentation,
    className: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300",
  },
  model: {
    icon: Box,
    className: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  },
  deployment: {
    icon: Globe,
    className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  },
  weights: {
    icon: Bot,
    className: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  },
  video: {
    icon: Video,
    className: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  },
  audio: {
    icon: Music,
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
  },
} as const

export function getPreviewExtension(input: {
  fileName?: string | null
  previewUrl?: string | null
  downloadUrl?: string | null
}) {
  const source = input.fileName ?? input.previewUrl ?? input.downloadUrl ?? ""
  const match = /\.([a-z0-9]+)(?:$|\?)/i.exec(source)
  return match?.[1]?.toLowerCase() ?? null
}

export function inferPreviewAssetType(input: {
  previewUrl?: string | null
  downloadUrl?: string | null
  fileName?: string | null
  formatLabel?: string | null
  title?: string | null
}): PreviewAssetType {
  const extension = getPreviewExtension(input)
  const format = input.formatLabel?.toLowerCase() ?? ""
  const title = input.title?.toLowerCase() ?? ""

  if (extension && ["glb", "gltf", "obj", "fbx", "stl", "usdz", "blend"].includes(extension)) {
    return "model"
  }
  if (extension && ["sol", "rs", "move"].includes(extension)) {
    return "contract"
  }
  if (extension && ["png", "jpg", "jpeg", "gif", "webp", "svg", "fig", "figma"].includes(extension)) {
    return "design"
  }
  if (extension && ["mp4", "webm", "mov", "avi", "mkv"].includes(extension)) {
    return "video"
  }
  if (extension && ["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(extension)) {
    return "audio"
  }
  if (extension && ["xlsx", "xls", "ods"].includes(extension)) {
    return "spreadsheet"
  }
  if (extension && ["ppt", "pptx", "odp", "key"].includes(extension)) {
    return "presentation"
  }
  if (extension && ["bin", "safetensors", "ckpt", "pt", "pth", "onnx", "gguf"].includes(extension)) {
    return "weights"
  }
  if (extension && ["html", "htm"].includes(extension)) {
    return "deployment"
  }
  if (extension && ["csv", "json", "parquet", "sql", "db", "sqlite"].includes(extension)) {
    return "data"
  }
  if (extension && ["ts", "tsx", "js", "jsx", "py", "go", "rs", "sol", "move", "java", "zip", "tar", "gz"].includes(extension)) {
    return ["rs", "sol", "move"].includes(extension) ? "contract" : "code"
  }

  if (format === "html") {
    return "deployment"
  }
  if (["ppt", "pptx", "odp", "key"].includes(format)) {
    return "presentation"
  }
  if (["glb", "gltf", "obj", "fbx", "stl", "usdz", "blend"].includes(format)) {
    return "model"
  }
  if (["bin", "safetensors", "ckpt", "pt", "pth", "onnx", "gguf"].includes(format)) {
    return "weights"
  }
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(format)) {
    return "video"
  }
  if (["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(format)) {
    return "audio"
  }
  if (["xlsx", "xls", "ods"].includes(format)) {
    return "spreadsheet"
  }
  if (["sol", "rs", "move"].includes(format)) {
    return "contract"
  }
  if (format === "pdf" || ["doc", "docx", "md", "txt", "rtf", "html"].includes(extension ?? "")) {
    return "document"
  }
  if (/(solidity|smart contract|staking contract|erc20|erc721|onchain|contract audit|rust contract)/.test(title)) {
    return "contract"
  }
  if (/(3d|model|mesh|render|asset pack)/.test(title)) {
    return "model"
  }
  if (/(website|landing page|frontend|web app|deployment|live preview|site preview)/.test(title)) {
    return "deployment"
  }
  if (/(weights|checkpoint|safetensors|finetune|trained model|gguf|onnx)/.test(title)) {
    return "weights"
  }
  if (/(video|teaser|reel|motion)/.test(title)) {
    return "video"
  }
  if (/(audio|voice|podcast|music)/.test(title)) {
    return "audio"
  }
  if (/(design|figma|visual|creative|banner|mockup)/.test(title)) {
    return "design"
  }
  if (/(spreadsheet|sheet|workbook|excel)/.test(title)) {
    return "spreadsheet"
  }
  if (/(presentation|deck|slides|pitch)/.test(title)) {
    return "presentation"
  }
  if (/(data|export|analytics|dataset|reporting)/.test(title)) {
    return "data"
  }
  if (/(code|script|template|app|api|automation)/.test(title)) {
    return "code"
  }

  return "document"
}

function isPdfPreview(item: DeliverablePreviewItem) {
  return item.formatLabel.toLowerCase() === "pdf" || getPreviewExtension(item) === "pdf"
}

function canFetchTextPreview(item: DeliverablePreviewItem) {
  if (!item.previewUrl) {
    return false
  }

  if (
    item.type === "code" ||
    item.type === "contract" ||
    item.type === "data" ||
    item.type === "spreadsheet"
  ) {
    return true
  }

  return false
}

function formatPreviewText(rawText: string, item: DeliverablePreviewItem) {
  const extension = getPreviewExtension(item)
  const trimmed = rawText.trim()

  if (item.type === "data" && extension === "json") {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2).slice(0, 8000)
    } catch {
      return trimmed.slice(0, 8000)
    }
  }

  return trimmed.slice(0, 8000)
}

function renderCsvPreviewRows(rawText: string) {
  const rows = rawText
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((row) => row.split(",").map((cell) => cell.trim()))

  if (rows.length < 2) {
    return null
  }

  const [header, ...body] = rows

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[#0b0b0b]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-white/65">
          <thead className="bg-white/[0.04] text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
            <tr>
              {header.map((cell, index) => (
                <th key={`${cell}-${index}`} className="px-4 py-3">
                  {cell || `Column ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-white/5">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 text-white/55">
                    {cell || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DeliverablePreviewDialog({
  item,
  open,
  onOpenChange,
}: {
  item: DeliverablePreviewItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [textPreview, setTextPreview] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const previewUrl = useMemo(
    () =>
      item
        ? buildDeliverablePreviewUrl(item.previewUrl, {
            fileName: item.fileName,
            formatLabel: item.formatLabel,
          })
        : null,
    [item],
  )
  const downloadUrl = useMemo(
    () =>
      item
        ? buildDeliverableDownloadUrl(item.downloadUrl, {
            fileName: item.fileName,
            formatLabel: item.formatLabel,
          })
        : null,
    [item],
  )
  const downloadFileName = useMemo(
    () =>
      item
        ? inferDeliverableFileName({
            url: item.downloadUrl ?? item.previewUrl,
            fileName: item.fileName,
            fallbackTitle: item.title,
            formatLabel: item.formatLabel,
          })
        : null,
    [item],
  )

  useEffect(() => {
    if (!open || !item || !previewUrl || !canFetchTextPreview(item)) {
      setTextPreview(null)
      setPreviewError(null)
      setIsLoadingPreview(false)
      return
    }

    const controller = new AbortController()

    setIsLoadingPreview(true)
    setPreviewError(null)
    setTextPreview(null)

    fetch(previewUrl, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Preview returned ${response.status}`)
        }

        const rawText = await response.text()
        setTextPreview(formatPreviewText(rawText, item))
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        const message =
          error instanceof Error ? error.message : "Preview could not be loaded inline."
        setPreviewError(message)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingPreview(false)
        }
      })

    return () => controller.abort()
  }, [item, open, previewUrl])

  const previewContent = useMemo(() => {
    if (!item) {
      return null
    }

    if (item.type === "document" && !isPdfPreview(item) && previewUrl) {
      return (
        <DocumentAssetPreview
          url={previewUrl}
          title={item.title}
          fileName={item.fileName}
          formatLabel={item.formatLabel}
          description={item.description}
        />
      )
    }

    if (item.type === "design" && previewUrl) {
      return (
        <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
          <div className="overflow-hidden rounded-[18px] border border-white/8 bg-[#080808]">
            <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.03] px-5 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                Design preview
              </div>
              <div className="text-xs text-white/35">{item.formatLabel}</div>
            </div>
            <div className="flex min-h-[340px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_45%),#070707] p-5">
              <img
                src={previewUrl}
                alt={item.title}
                className="max-h-[52vh] w-full rounded-[16px] object-contain shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>
        </div>
      )
    }

    if (item.type === "video" && previewUrl) {
      return (
        <div className="overflow-hidden rounded-[18px] border border-white/8 bg-black">
          <video
            controls
            preload="metadata"
            className="max-h-[58vh] w-full bg-black"
            src={previewUrl}
          />
        </div>
      )
    }

    if (item.type === "audio" && previewUrl) {
      return (
        <div className="rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-8 py-10">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-300">
              <PlayCircle className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm text-white/45">
                Listen to the delivered audio sample directly here.
              </p>
            </div>
            <audio controls preload="metadata" className="w-full" src={previewUrl} />
          </div>
        </div>
      )
    }

    if (item.type === "model") {
      return (
        <ModelAssetPreview
          url={previewUrl ?? downloadUrl ?? ""}
          fileName={item.fileName}
          formatLabel={item.formatLabel}
          title={item.title}
        />
      )
    }

    if (item.type === "presentation") {
      return (
        <PresentationAssetPreview
          url={previewUrl ?? downloadUrl ?? ""}
          fileName={item.fileName}
          formatLabel={item.formatLabel}
          title={item.title}
        />
      )
    }

    if (item.type === "deployment") {
      return previewUrl ? (
        <div className="overflow-hidden rounded-[18px] border border-white/8 bg-black">
          <iframe title={`${item.title} deployment preview`} src={previewUrl} className="h-[58vh] w-full bg-white" />
        </div>
      ) : (
        <div className="rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,165,233,0.14),rgba(255,255,255,0.02))] p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-300">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-7 text-white/55">
                Web deployments can show live preview links directly inside the deliverables dashboard when a hosted URL is attached.
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (item.type === "weights") {
      return (
        <WeightsAssetPreview
          url={previewUrl ?? downloadUrl ?? ""}
          fileName={item.fileName}
          formatLabel={item.formatLabel}
          title={item.title}
        />
      )
    }

    if (isPdfPreview(item) && previewUrl) {
      return (
        <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
          <div className="overflow-hidden rounded-[18px] border border-white/8 bg-white">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
              <span>PDF preview</span>
              <span>{item.formatLabel}</span>
            </div>
            <iframe
              title={`${item.title} preview`}
              src={previewUrl}
              className="h-[58vh] w-full"
            />
          </div>
        </div>
      )
    }

    if (canFetchTextPreview(item)) {
      if (isLoadingPreview) {
        return (
          <div className="flex min-h-[360px] items-center justify-center rounded-[18px] border border-white/8 bg-[#0b0b0b]">
            <div className="flex items-center gap-3 text-sm text-white/45">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading preview...
            </div>
          </div>
        )
      }

      if (previewError) {
        return (
          <div className="rounded-[18px] border border-rose-500/20 bg-rose-500/5 p-6">
            <p className="text-sm font-semibold text-rose-300">Inline preview unavailable</p>
            <p className="mt-2 text-sm text-white/45">
              {previewError}. Download the file below to inspect the full asset.
            </p>
          </div>
        )
      }

      if (
        textPreview &&
        (item.type === "data" || item.type === "spreadsheet") &&
        item.formatLabel.toLowerCase() === "csv"
      ) {
        const csvPreview = renderCsvPreviewRows(textPreview)
        if (csvPreview) {
          return csvPreview
        }
      }

      if (textPreview) {
        return (
          <div className="overflow-hidden rounded-[18px] border border-white/8 bg-[#101010]">
            <div className="border-b border-white/8 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              {item.type === "contract"
                ? "Smart contract source"
                : item.type === "spreadsheet"
                  ? "Spreadsheet preview"
                  : item.type === "data"
                    ? "Structured data preview"
                    : item.type === "code"
                      ? "Code preview"
                      : "Document preview"}
            </div>
            <pre className="max-h-[58vh] overflow-auto p-5 text-sm leading-7 text-white/70">
              <code>{textPreview}</code>
            </pre>
          </div>
        )
      }
    }

    return (
      <div className="rounded-[18px] border border-white/8 bg-[#0b0b0b] p-8">
        <p className="text-sm leading-7 text-white/55">
          {item.description ?? "This delivered asset is ready to open or download."}
        </p>
      </div>
    )
  }, [downloadUrl, isLoadingPreview, item, previewError, previewUrl, textPreview])

  const metaBits = [
    item?.formatLabel || null,
    item?.sizeLabel || null,
    !item?.sizeLabel ? item?.sourceLabel || null : null,
  ].filter((value): value is string => Boolean(value))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[920px] overflow-hidden rounded-[24px] border-white/10 bg-[#111111] p-0 text-white shadow-[0_20px_90px_rgba(0,0,0,0.55)]">
        {item ? (
          <>
            <DialogHeader className="border-b border-white/8 px-6 py-5 text-left">
              <div className="flex items-start gap-4 pr-8">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    typeMeta[item.type].className,
                  )}
                >
                  {(() => {
                    const Icon = typeMeta[item.type].icon
                    return <Icon className="h-4.5 w-4.5" />
                  })()}
                </div>

                <div className="min-w-0">
                  <DialogTitle className="truncate text-xl font-semibold text-white">
                    {item.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/30">
                    {metaBits.map((bit, index) => (
                      <span key={`${bit}-${index}`} className="inline-flex items-center gap-2">
                        {index > 0 ? <span className="text-white/20">•</span> : null}
                        <span>{bit}</span>
                      </span>
                    ))}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="bg-[#0d0d0d] px-5 py-5">
              {previewContent}
            </div>

            <div className="flex flex-col gap-4 border-t border-white/8 bg-[#111111] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-white/38">
                <span className="text-white/25">Generated by</span>
                <span className="font-medium text-white/65">
                  {item.agentName ?? item.subtitle ?? "AgentCommerce"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {item.sourceLabel ? (
                  <Badge variant="outline" className="hidden border-white/10 bg-white/[0.03] text-white/45 sm:inline-flex">
                    {item.sourceLabel}
                  </Badge>
                ) : null}
                {downloadUrl ? (
                  <Button asChild className="bg-indigo-600 text-white hover:bg-indigo-500">
                    <a
                      href={downloadUrl}
                      download={downloadFileName ?? undefined}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download {item.formatLabel}
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
