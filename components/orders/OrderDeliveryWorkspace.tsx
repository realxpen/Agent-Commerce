"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Bot,
  Box,
  Clock3,
  Database,
  Eye,
  ExternalLink,
  FileStack,
  FileText,
  Globe,
  History,
  Image as ImageIcon,
  MessageSquareQuote,
  Music,
  PackageCheck,
  PlayCircle,
  ScrollText,
  Presentation,
  Sparkles,
  Table2,
  Video,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DeliverablePreviewDialog,
  inferPreviewAssetType,
} from "@/components/deliverables/DeliverablePreviewDialog"
import { ModelAssetPreview } from "@/components/deliverables/ModelAssetPreview"
import { PresentationAssetPreview } from "@/components/deliverables/PresentationAssetPreview"
import { WeightsAssetPreview } from "@/components/deliverables/WeightsAssetPreview"
import type {
  DeliveryStatus,
  OrderDeliveryVersion,
  OrderRevisionRequest,
  OrderStatus,
} from "@/lib/api/types"
import { cn } from "@/lib/utils"

type DeliveryBlock =
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; items: string[] }
  | { type: "code"; content: string; language: string | null }

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return new Date(value).toLocaleString()
}

function getStatusBadgeTone(
  value: DeliveryStatus | OrderStatus | OrderRevisionRequest["status"],
): "success" | "warning" | "destructive" | "outline" {
  if (
    value === "COMPLETED" ||
    value === "PAID" ||
    value === "DELIVERED" ||
    value === "ADDRESSED"
  ) {
    return "success"
  }

  if (
    value === "PENDING" ||
    value === "IN_PROGRESS" ||
    value === "AWAITING_REVIEW" ||
    value === "OPEN" ||
    value === "ADDRESSING"
  ) {
    return "warning"
  }

  if (
    value === "FAILED" ||
    value === "CANCELLED"
  ) {
    return "destructive"
  }

  return "outline"
}

function getDeliveryVersionSourceLabel(value: "ai_task" | "owner_publish") {
  return value === "owner_publish" ? "Owner Publish" : "AI Task"
}

function renderInlineContent(value: string) {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index))
    }

    if (match[1] && match[2]) {
      nodes.push(
        <Link
          key={`${match[2]}-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-indigo-300 underline decoration-indigo-500/40 underline-offset-4 transition hover:text-indigo-200"
        >
          {match[1]}
        </Link>,
      )
    } else if (match[3]) {
      nodes.push(
        <Link
          key={`${match[3]}-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-indigo-300 underline decoration-indigo-500/40 underline-offset-4 transition hover:text-indigo-200"
        >
          {match[3]}
        </Link>,
      )
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : value
}

function parseDeliveryContent(value: string | null | undefined): DeliveryBlock[] {
  if (!value) {
    return []
  }

  const lines = value.replace(/\r\n?/g, "\n").split("\n")
  const blocks: DeliveryBlock[] = []
  let index = 0

  while (index < lines.length) {
    const rawLine = lines[index] ?? ""
    const trimmedLine = rawLine.trim()

    if (!trimmedLine) {
      index += 1
      continue
    }

    if (trimmedLine.startsWith("```")) {
      const language = trimmedLine.slice(3).trim() || null
      const codeLines: string[] = []
      index += 1

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index])
        index += 1
      }

      if (index < lines.length) {
        index += 1
      }

      blocks.push({
        type: "code",
        content: codeLines.join("\n").trimEnd(),
        language,
      })
      continue
    }

    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        content: headingMatch[2].trim(),
      })
      index += 1
      continue
    }

    const unorderedMatch = trimmedLine.match(/^[-*]\s+(.+)$/)
    if (unorderedMatch) {
      const items: string[] = []

      while (index < lines.length) {
        const nextLine = (lines[index] ?? "").trim()
        const itemMatch = nextLine.match(/^[-*]\s+(.+)$/)
        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({
        type: "list",
        ordered: false,
        items,
      })
      continue
    }

    const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      const items: string[] = []

      while (index < lines.length) {
        const nextLine = (lines[index] ?? "").trim()
        const itemMatch = nextLine.match(/^\d+\.\s+(.+)$/)
        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1].trim())
        index += 1
      }

      blocks.push({
        type: "list",
        ordered: true,
        items,
      })
      continue
    }

    const quoteMatch = trimmedLine.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      const items: string[] = []

      while (index < lines.length) {
        const nextLine = (lines[index] ?? "").trim()
        const nextQuoteMatch = nextLine.match(/^>\s?(.*)$/)
        if (!nextQuoteMatch) {
          break
        }

        items.push(nextQuoteMatch[1].trim())
        index += 1
      }

      blocks.push({
        type: "quote",
        items,
      })
      continue
    }

    const paragraphLines: string[] = []

    while (index < lines.length) {
      const nextLine = lines[index] ?? ""
      const nextTrimmedLine = nextLine.trim()

      if (!nextTrimmedLine) {
        break
      }

      if (
        nextTrimmedLine.startsWith("```") ||
        /^(#{1,3})\s+/.test(nextTrimmedLine) ||
        /^[-*]\s+/.test(nextTrimmedLine) ||
        /^\d+\.\s+/.test(nextTrimmedLine) ||
        /^>\s?/.test(nextTrimmedLine)
      ) {
        break
      }

      paragraphLines.push(nextTrimmedLine)
      index += 1
    }

    blocks.push({
      type: "paragraph",
      content: paragraphLines.join(" "),
    })
  }

  return blocks
}

function StructuredDeliveryBody({
  value,
  compact = false,
}: {
  value: string | null | undefined
  compact?: boolean
}) {
  const blocks = useMemo(() => parseDeliveryContent(value), [value])

  if (blocks.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/45">
        No delivery body has been attached yet.
      </div>
    )
  }

  return (
    <div
      className={cn(
        "space-y-4",
        compact ? "max-h-[28rem] overflow-y-auto pr-2" : "space-y-5",
      )}
    >
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag =
            block.level === 1
              ? "h2"
              : block.level === 2
                ? "h3"
                : "h4"

          return (
            <HeadingTag
              key={`heading-${index}`}
              className={cn(
                "font-display font-semibold tracking-tight text-white",
                block.level === 1 && "text-2xl",
                block.level === 2 && "text-xl",
                block.level === 3 && "text-lg",
              )}
            >
              {renderInlineContent(block.content)}
            </HeadingTag>
          )
        }

        if (block.type === "paragraph") {
          return (
            <p
              key={`paragraph-${index}`}
              className={cn(
                "leading-7 text-white/72",
                compact ? "text-sm" : "text-[15px]",
              )}
            >
              {renderInlineContent(block.content)}
            </p>
          )
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul"

          return (
            <ListTag
              key={`list-${index}`}
              className={cn(
                "space-y-2 pl-5 text-white/72",
                block.ordered ? "list-decimal" : "list-disc",
                compact ? "text-sm" : "text-[15px]",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`list-item-${index}-${itemIndex}`} className="pl-1 leading-7">
                  {renderInlineContent(item)}
                </li>
              ))}
            </ListTag>
          )
        }

        if (block.type === "quote") {
          return (
            <div
              key={`quote-${index}`}
              className="rounded-3xl border border-indigo-500/15 bg-indigo-500/8 p-4"
            >
              <div className="space-y-2">
                {block.items.map((item, itemIndex) => (
                  <p
                    key={`quote-item-${index}-${itemIndex}`}
                    className={cn(
                      "leading-7 text-indigo-100/85",
                      compact ? "text-sm" : "text-[15px]",
                    )}
                  >
                    {renderInlineContent(item)}
                  </p>
                ))}
              </div>
            </div>
          )
        }

        return (
          <div
            key={`code-${index}`}
            className="overflow-hidden rounded-3xl border border-white/10 bg-black/35"
          >
            {block.language ? (
              <div className="border-b border-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">
                {block.language}
              </div>
            ) : null}
            <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-white/78">
              <code>{block.content}</code>
            </pre>
          </div>
        )
      })}
    </div>
  )
}

function getUrlFormatLabel(url: string) {
  const match = /\.([a-z0-9]+)(?:$|\?)/i.exec(url)
  return match?.[1]?.toUpperCase() ?? "FILE"
}

function InlineDeliveryHero({
  title,
  url,
  description,
  type,
  onPreview,
}: {
  title: string
  url: string
  description: string | null
  type:
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
  onPreview: () => void
}) {
  if (type === "design") {
    return (
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
        <div className="relative">
          <img
            src={url}
            alt={title}
            className="h-[420px] w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-6 py-6">
            <div>
              <p className="text-lg font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm text-white/55">
                Design preview is visible inline. Open the modal for a cleaner focused view.
              </p>
            </div>
            <Button
              type="button"
              onClick={onPreview}
              className="shrink-0 bg-indigo-600 text-white hover:bg-indigo-500"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (type === "video") {
    return (
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
        <video
          controls
          preload="metadata"
          className="h-[420px] w-full bg-black object-contain"
          src={url}
        />
      </div>
    )
  }

  if (type === "audio") {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-300">
            <PlayCircle className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xl font-semibold text-white">{title}</p>
            <p className="mt-2 max-w-xl text-sm leading-7 text-white/55">
              {description ?? "This audio delivery is ready to review inline or open in the focused preview modal."}
            </p>
          </div>
          <audio controls preload="metadata" className="w-full" src={url} />
          <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Open focused preview
          </Button>
        </div>
      </div>
    )
  }

  if (type === "model") {
    return (
      <div className="space-y-4">
        <ModelAssetPreview url={url} title={title} formatLabel={getUrlFormatLabel(url)} compact />
        <div className="flex justify-end">
          <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Open focused preview
          </Button>
        </div>
      </div>
    )
  }

  if (type === "presentation") {
    return (
      <div className="space-y-4">
        <PresentationAssetPreview
          url={url}
          title={title}
          formatLabel={getUrlFormatLabel(url)}
          compact
        />
        <div className="flex justify-end">
          <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Open focused preview
          </Button>
        </div>
      </div>
    )
  }

  if (type === "deployment") {
    return (
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
            <Globe className="h-4 w-4 text-sky-300" />
            Live deployment preview
          </div>
          <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Focus
          </Button>
        </div>
        <iframe title={`${title} deployment`} src={url} className="h-[460px] w-full bg-white" />
      </div>
    )
  }

  if (type === "weights") {
    return (
      <div className="space-y-4">
        <WeightsAssetPreview url={url} title={title} formatLabel={getUrlFormatLabel(url)} compact />
        <div className="flex justify-end">
          <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Open focused preview
          </Button>
        </div>
      </div>
    )
  }

  if (type === "document" && getUrlFormatLabel(url).toLowerCase() === "pdf") {
    return (
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-black/55">
            <FileText className="h-4 w-4" />
            PDF preview
          </div>
          <Button type="button" variant="outline" className="border-black/10 bg-white text-black hover:bg-black/5" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Focus
          </Button>
        </div>
        <iframe title={`${title} inline preview`} src={url} className="h-[460px] w-full" />
      </div>
    )
  }

  const meta = {
    document: {
      icon: FileText,
      title: "Document delivery",
      accent: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    },
    code: {
      icon: FileText,
      title: "Code package",
      accent: "border-purple-500/20 bg-purple-500/10 text-purple-300",
    },
    contract: {
      icon: ScrollText,
      title: "Smart contract delivery",
      accent: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    },
    data: {
      icon: Database,
      title: "Data export",
      accent: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    },
    spreadsheet: {
      icon: Table2,
      title: "Spreadsheet delivery",
      accent: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    },
    presentation: {
      icon: Presentation,
      title: "Presentation delivery",
      accent: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300",
    },
    model: {
      icon: Box,
      title: "3D model delivery",
      accent: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    },
    deployment: {
      icon: Globe,
      title: "Web deployment delivery",
      accent: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    },
    weights: {
      icon: Bot,
      title: "Model weights delivery",
      accent: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    },
    video: {
      icon: Video,
      title: "Video delivery",
      accent: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    },
    audio: {
      icon: Music,
      title: "Audio delivery",
      accent: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    },
    design: {
      icon: ImageIcon,
      title: "Design delivery",
      accent: "border-pink-500/20 bg-pink-500/10 text-pink-300",
    },
  }[type]

  const Icon = meta.icon

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-8">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="space-y-5">
          <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl border", meta.accent)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">
              {meta.title}
            </p>
            <h3 className="mt-3 text-3xl font-display font-bold text-white">{title}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              {description ?? "This delivery is ready to inspect in a focused preview or open directly from the handoff link."}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Preview actions
          </p>
          <div className="mt-4 space-y-3">
            <Button type="button" onClick={onPreview} className="w-full bg-indigo-600 text-white hover:bg-indigo-500">
              <Eye className="mr-2 h-4 w-4" />
              Open focused preview
            </Button>
            <Link
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Open source file
            </Link>
          </div>
          <p className="mt-4 text-xs leading-6 text-white/35">
            {type === "code"
              ? "Use focused preview for a cleaner code read, then open or download the full package."
              : type === "contract"
                ? "Open the focused preview to inspect the smart contract handoff more clearly before downloading the full source."
              : type === "data" || type === "spreadsheet"
                ? "Review the exported dataset from a cleaner modal, then open the full file if needed."
                : "Use the focused modal for a cleaner inspection before opening the full file."}
          </p>
        </div>
      </div>
    </div>
  )
}

export function OrderDeliveryWorkspace({
  deliveryUrl,
  deliveryText,
  deliveredAt,
  status,
  deliveryStatus,
  deliveryVersions,
  revisionRequests,
  agentName,
  serviceTitle,
}: {
  deliveryUrl?: string | null
  deliveryText?: string | null
  deliveredAt?: string | null
  status?: OrderStatus | null
  deliveryStatus?: DeliveryStatus | null
  deliveryVersions: OrderDeliveryVersion[]
  revisionRequests: OrderRevisionRequest[]
  agentName?: string | null
  serviceTitle?: string | null
}) {
  const hasDelivery = Boolean(deliveryUrl || deliveryText)
  const isFailureNote = status === "FAILED" && !deliveredAt
  const isAwaitingReview = deliveryStatus === "AWAITING_REVIEW"
  const [previewItem, setPreviewItem] = useState<{
    title: string
    description: string | null
    type:
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
    formatLabel: string
    previewUrl: string | null
    downloadUrl: string | null
    fileName?: string | null
    subtitle?: string | null
    agentName?: string | null
    sourceLabel?: string | null
    dateLabel?: string | null
  } | null>(null)
  const latestVersion = useMemo(() => {
    return deliveryVersions.reduce<OrderDeliveryVersion | null>((current, version) => {
      if (!current || version.versionNumber > current.versionNumber) {
        return version
      }

      return current
    }, null)
  }, [deliveryVersions])
  const activeRevisionCount = revisionRequests.filter(
    (revision) => revision.status === "OPEN" || revision.status === "ADDRESSING",
  ).length
  const defaultTab = hasDelivery
    ? "delivery"
    : deliveryVersions.length > 0
      ? "versions"
      : "revisions"

  const openPreview = ({
    title,
    url,
    description,
    sourceLabel,
    dateLabel,
  }: {
    title: string
    url: string
    description: string | null
    sourceLabel: string
    dateLabel: string | null
  }) => {
    const formatMatch = /\.([a-z0-9]+)(?:$|\?)/i.exec(url)
    const formatLabel = formatMatch?.[1]?.toUpperCase() ?? "FILE"

    setPreviewItem({
      title,
      description,
      type: inferPreviewAssetType({
        previewUrl: url,
        downloadUrl: url,
        formatLabel,
        title,
      }),
      formatLabel,
      previewUrl: url,
      downloadUrl: url,
      subtitle: serviceTitle,
      agentName,
      sourceLabel,
      dateLabel,
    })
  }

  return (
    <Card className="glass-card overflow-hidden border-white/5">
      <CardHeader className="space-y-6 border-b border-white/5 pb-6">
        <div className="rounded-[28px] border border-indigo-500/15 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.2),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/12 text-indigo-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-200/70">
                    Delivery Workspace
                  </p>
                  <CardTitle className="mt-2 text-2xl font-display font-bold">
                    {hasDelivery
                      ? isFailureNote
                        ? "Fulfillment Note"
                        : "Final Delivery"
                      : isAwaitingReview
                        ? "Waiting on owner review"
                        : "Delivery not published yet"}
                  </CardTitle>
                </div>
              </div>

              <p className="max-w-3xl text-sm leading-7 text-white/62">
                {hasDelivery
                  ? "Review the latest handoff, open any linked asset, and use version history without digging through dense raw text."
                  : isAwaitingReview
                    ? "A draft exists, but the final customer-facing handoff has not been published yet."
                    : "This order has not produced a customer-facing delivery yet. When it does, the handoff will appear here in a structured format."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {deliveryStatus ? (
                <Badge
                  variant={getStatusBadgeTone(deliveryStatus)}
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                >
                  {deliveryStatus}
                </Badge>
              ) : null}

              {latestVersion ? (
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                >
                  Version {latestVersion.versionNumber}
                </Badge>
              ) : null}

              {deliveryUrl ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-white/10 bg-white/5 text-xs font-semibold text-white/78 hover:bg-white/10 hover:text-white"
                    onClick={() =>
                      openPreview({
                        title: serviceTitle ? `${serviceTitle} delivery` : "Final delivery",
                        url: deliveryUrl,
                        description: deliveryText ?? null,
                        sourceLabel: "Current delivery",
                        dateLabel: formatTimestamp(deliveredAt),
                      })
                    }
                  >
                    <Eye className="mr-2 h-3.5 w-3.5" />
                    Preview Delivery
                  </Button>
                  <Link
                    href={deliveryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Delivery
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                Published
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                <Clock3 className="h-4 w-4 text-indigo-300" />
                {formatTimestamp(deliveredAt) ?? "Not published yet"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                Delivery Versions
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                <FileStack className="h-4 w-4 text-indigo-300" />
                {deliveryVersions.length} tracked handoff{deliveryVersions.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                Revision Requests
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                <MessageSquareQuote className="h-4 w-4 text-indigo-300" />
                {revisionRequests.length} total{activeRevisionCount > 0 ? ` • ${activeRevisionCount} active` : ""}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs defaultValue={defaultTab} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-white/[0.04] p-1">
            <TabsTrigger className="rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.16em]" value="delivery">
              Current Delivery
            </TabsTrigger>
            <TabsTrigger className="rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.16em]" value="versions">
              Versions
            </TabsTrigger>
            <TabsTrigger className="rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.16em]" value="revisions">
              Revisions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="delivery" className="space-y-5">
            {hasDelivery ? (
              <>
                {deliveryUrl ? (
                  <InlineDeliveryHero
                    title={serviceTitle ? `${serviceTitle} delivery` : "Final delivery"}
                    url={deliveryUrl}
                    description={deliveryText ?? null}
                    type={inferPreviewAssetType({
                      previewUrl: deliveryUrl,
                      downloadUrl: deliveryUrl,
                      formatLabel: getUrlFormatLabel(deliveryUrl),
                      title: serviceTitle ?? "Final delivery",
                    })}
                    onPreview={() =>
                      openPreview({
                        title: serviceTitle ? `${serviceTitle} delivery` : "Final delivery",
                        url: deliveryUrl,
                        description: deliveryText ?? null,
                        sourceLabel: "Current delivery",
                        dateLabel: formatTimestamp(deliveredAt),
                      })
                    }
                  />
                ) : null}

                {deliveryUrl ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-white/72">
                        <PackageCheck className="h-4 w-4 text-indigo-300" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                          Primary Handoff Link
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/10 bg-white/5"
                        onClick={() =>
                          openPreview({
                            title: serviceTitle ? `${serviceTitle} delivery` : "Final delivery",
                            url: deliveryUrl,
                            description: deliveryText ?? null,
                            sourceLabel: "Current delivery",
                            dateLabel: formatTimestamp(deliveredAt),
                          })
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                    </div>
                    <Link
                      href={deliveryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-300 underline decoration-indigo-500/40 underline-offset-4 transition hover:text-indigo-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {deliveryUrl}
                    </Link>
                  </div>
                ) : null}

                {deliveryText ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                    <div className="mb-5 flex items-center gap-2 text-white/72">
                      <FileText className={cn("h-4 w-4", isFailureNote ? "text-amber-300" : "text-indigo-300")} />
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                        {isFailureNote ? "Failure Note" : "Delivery Notes"}
                      </span>
                    </div>
                    <StructuredDeliveryBody value={deliveryText} />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/56">
                <div className="flex items-start gap-3">
                  <PackageCheck className="mt-0.5 h-5 w-5 text-indigo-300" />
                  <div>
                    <p className="font-semibold text-white">
                      {isAwaitingReview ? "A delivery draft is waiting on review" : "No delivery published yet"}
                    </p>
                    <p className="mt-2 leading-7">
                      {isAwaitingReview
                        ? "The service has produced a draft, but the final customer-facing delivery is still waiting for owner approval."
                        : "The order does not have a published handoff yet. When the delivery is ready, it will appear here with a structured summary and asset links."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="versions" className="space-y-4">
            {deliveryVersions.length > 0 ? (
              deliveryVersions
                .slice()
                .reverse()
                .map((version) => {
                  const linkedRevision = revisionRequests.find(
                    (revision) => revision.id === version.revisionRequestId,
                  )

                  return (
                    <div
                      key={version.id}
                      className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-white">
                              Version {version.versionNumber}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold uppercase tracking-[0.16em]"
                            >
                              {getDeliveryVersionSourceLabel(version.source)}
                            </Badge>
                            {latestVersion?.id === version.id ? (
                              <Badge
                                variant="success"
                                className="text-[10px] font-bold uppercase tracking-[0.16em]"
                              >
                                Current
                              </Badge>
                            ) : null}
                          </div>

                          <p className="text-sm text-white/45">
                            Published {formatTimestamp(version.createdAt)}
                          </p>

                          {linkedRevision ? (
                            <p className="text-sm leading-7 text-white/62">
                              Revision note: {linkedRevision.note}
                            </p>
                          ) : null}
                        </div>

                        {version.deliveryUrl ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full border-white/10 bg-white/5 text-xs font-semibold text-white/78 hover:bg-white/10 hover:text-white"
                              onClick={() =>
                                openPreview({
                                  title: `${serviceTitle ?? "Delivery"} v${version.versionNumber}`,
                                  url: version.deliveryUrl!,
                                  description: version.deliveryText ?? null,
                                  sourceLabel: `Version ${version.versionNumber}`,
                                  dateLabel: formatTimestamp(version.createdAt),
                                })
                              }
                            >
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              Preview
                            </Button>
                            <Link
                              href={version.deliveryUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open Version
                            </Link>
                          </div>
                        ) : null}
                      </div>

                      {version.deliveryText ? (
                        <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
                          <StructuredDeliveryBody value={version.deliveryText} compact />
                        </div>
                      ) : null}
                    </div>
                  )
                })
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/56">
                Version history will appear after the first customer-facing delivery is published.
              </div>
            )}
          </TabsContent>

          <TabsContent value="revisions" className="space-y-4">
            {revisionRequests.length > 0 ? (
              revisionRequests
                .slice()
                .reverse()
                .map((revision) => (
                  <div
                    key={revision.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-indigo-300" />
                          <p className="text-base font-semibold text-white">
                            {revision.note}
                          </p>
                        </div>
                        <p className="text-sm text-white/45">
                          Requested {formatTimestamp(revision.requestedAt)}
                        </p>
                        {revision.failureReason ? (
                          <p className="text-sm leading-7 text-amber-100">
                            {revision.failureReason}
                          </p>
                        ) : null}
                      </div>

                      <Badge
                        variant={getStatusBadgeTone(revision.status)}
                        className="text-[10px] font-bold uppercase tracking-[0.16em]"
                      >
                        {revision.status}
                      </Badge>
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/56">
                No revision requests have been submitted for this order yet.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <DeliverablePreviewDialog
        item={previewItem}
        open={Boolean(previewItem)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewItem(null)
          }
        }}
      />
    </Card>
  )
}
