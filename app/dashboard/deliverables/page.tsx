"use client"

import Link from "next/link"
import { useDeferredValue, useMemo, useState } from "react"
import {
  Bot,
  Box,
  CheckCircle2,
  ChevronDown,
  Code,
  Database,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Music,
  ScrollText,
  Presentation,
  RefreshCcw,
  Search,
  Table2,
  Video,
} from "lucide-react"
import { DeliverablePreviewDialog } from "@/components/deliverables/DeliverablePreviewDialog"
import { WalletRouteGuard } from "@/components/guards"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SkeletonBlock, StatusNoticeCard } from "@/components/states"
import {
  useDashboardDeliverables,
  type DashboardDeliverableItem,
  type DashboardDeliverableStatus,
  type DashboardDeliverableType,
} from "@/hooks/dashboard/useDashboardDeliverables"
import {
  buildDeliverableDownloadUrl,
  inferDeliverableFileName,
} from "@/lib/deliverables/file-access"
import { cn } from "@/lib/utils"

const typeOptions: Array<{ value: DashboardDeliverableType | "all"; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "document", label: "Documents" },
  { value: "code", label: "Code" },
  { value: "contract", label: "Smart Contracts" },
  { value: "design", label: "Design" },
  { value: "data", label: "Data" },
  { value: "spreadsheet", label: "Spreadsheets" },
  { value: "presentation", label: "Presentations" },
  { value: "model", label: "3D Models" },
  { value: "deployment", label: "Web Deployments" },
  { value: "weights", label: "Agent Weights" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
]

const statusOptions: Array<{ value: DashboardDeliverableStatus | "all"; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "ready", label: "Ready" },
  { value: "review", label: "Review" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
]

const typeMeta = {
  document: {
    label: "Document",
    icon: FileText,
    className: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },
  code: {
    label: "Code",
    icon: Code,
    className: "border-purple-500/20 bg-purple-500/10 text-purple-300",
  },
  contract: {
    label: "Contract",
    icon: ScrollText,
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  design: {
    label: "Design",
    icon: ImageIcon,
    className: "border-pink-500/20 bg-pink-500/10 text-pink-300",
  },
  data: {
    label: "Data",
    icon: Database,
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  spreadsheet: {
    label: "Spreadsheet",
    icon: Table2,
    className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  },
  presentation: {
    label: "Presentation",
    icon: Presentation,
    className: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300",
  },
  model: {
    label: "3D Model",
    icon: Box,
    className: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  },
  deployment: {
    label: "Deployment",
    icon: Globe,
    className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  },
  weights: {
    label: "Weights",
    icon: Bot,
    className: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  },
  video: {
    label: "Video",
    icon: Video,
    className: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  },
  audio: {
    label: "Audio",
    icon: Music,
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
  },
} as const

const statusMeta = {
  ready: {
    label: "Ready",
    variant: "success" as const,
    className: "",
  },
  review: {
    label: "Review",
    variant: "warning" as const,
    className: "",
  },
  processing: {
    label: "Processing",
    variant: "warning" as const,
    className: "",
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    className: "",
  },
} as const

function DeliverableStatusBadge({
  status,
}: {
  status: DashboardDeliverableStatus
}) {
  const meta = statusMeta[status]

  return (
    <Badge
      variant={meta.variant}
      className={cn(
        "px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
        meta.className,
      )}
    >
      {meta.label}
    </Badge>
  )
}

function DeliverableActions({
  item,
  onPreview,
}: {
  item: DashboardDeliverableItem
  onPreview: (item: DashboardDeliverableItem) => void
}) {
  const downloadUrl = buildDeliverableDownloadUrl(item.downloadUrl, {
    fileName: item.fileName,
    formatLabel: item.formatLabel,
  })
  const downloadFileName = inferDeliverableFileName({
    url: item.downloadUrl,
    fileName: item.fileName,
    fallbackTitle: item.title,
    formatLabel: item.formatLabel,
  })

  return (
    <div className="flex items-center gap-2">
      {item.previewUrl ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white/45 hover:text-white"
          onClick={() => onPreview(item)}
          title="Preview deliverable"
        >
            <Eye className="h-4 w-4" />
        </Button>
      ) : null}

      {downloadUrl ? (
        <Button asChild variant="ghost" size="icon" className="h-9 w-9 text-white/45 hover:text-white">
          <a
            href={downloadUrl}
            download={downloadFileName}
            title="Download deliverable"
          >
            <Download className="h-4 w-4" />
          </a>
        </Button>
      ) : null}

      <Button asChild variant="outline" className="border-white/10 bg-white/5">
        <Link href={item.orderHref}>Open Order</Link>
      </Button>
    </div>
  )
}

function DeliverableGridCard({
  item,
  onPreview,
}: {
  item: DashboardDeliverableItem
  onPreview: (item: DashboardDeliverableItem) => void
}) {
  const meta = typeMeta[item.type]
  const Icon = meta.icon

  return (
    <Card className="glass-card overflow-hidden border-white/5 transition-all group hover:border-white/10 hover:bg-white/[0.04]">
      <CardContent className="flex h-full flex-col p-0">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 p-5">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", meta.className)}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              {item.formatLabel}
            </span>
            {item.artifactCount > 1 ? (
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                {item.artifactCount} Files
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-white/30">
                {item.serviceTitle}
              </p>
            </div>
            <DeliverableStatusBadge status={item.status} />
          </div>

          <p className="line-clamp-3 text-sm leading-6 text-white/45">{item.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={`${item.id}-${tag}`}
                className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-white/45">
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/30">Agent</span>
              <span className="truncate text-right text-white/65">{item.agentName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/30">Source</span>
              <span className="truncate text-right text-white/65">{item.sourceLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/30">Updated</span>
              <span className="truncate text-right text-white/65">{item.dateLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-white/5 bg-black/20 p-4">
          <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]", meta.className)}>
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </div>

          <DeliverableActions item={item} onPreview={onPreview} />
        </div>
      </CardContent>
    </Card>
  )
}

function DeliverableListRow({
  item,
  onPreview,
}: {
  item: DashboardDeliverableItem
  onPreview: (item: DashboardDeliverableItem) => void
}) {
  const meta = typeMeta[item.type]
  const Icon = meta.icon

  return (
    <Card className="glass-card border-white/5 p-5 transition-all hover:border-white/10 hover:bg-white/[0.04]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="flex min-w-[240px] items-center gap-4">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border", meta.className)}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{item.title}</p>
            <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-white/30">
              {item.serviceTitle}
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm leading-6 text-white/45">{item.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              {item.formatLabel}
            </span>
            {item.artifactCount > 1 ? (
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                {item.artifactCount} files
              </span>
            ) : null}
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              {item.sourceLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-2 text-sm text-white/45 xl:min-w-[210px]">
          <div className="flex items-center justify-between gap-3 xl:block">
            <span className="text-white/30 xl:block">Agent</span>
            <span className="text-white/65">{item.agentName}</span>
          </div>
          <div className="flex items-center justify-between gap-3 xl:block">
            <span className="text-white/30 xl:block">Updated</span>
            <span className="text-white/65">{item.dateLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
          <DeliverableStatusBadge status={item.status} />
          <DeliverableActions item={item} onPreview={onPreview} />
        </div>
      </div>
    </Card>
  )
}

export default function DeliverablesPage() {
  const deliverables = useDashboardDeliverables()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<DashboardDeliverableType | "all">("all")
  const [selectedStatus, setSelectedStatus] = useState<DashboardDeliverableStatus | "all">("all")
  const [previewItem, setPreviewItem] = useState<DashboardDeliverableItem | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase())

  const typeCounts = useMemo(() => {
    return deliverables.deliverables.reduce<Record<DashboardDeliverableType, number>>(
      (current, item) => {
        current[item.type] += 1
        return current
      },
      {
        document: 0,
        code: 0,
        contract: 0,
        design: 0,
        data: 0,
        spreadsheet: 0,
        presentation: 0,
        model: 0,
        deployment: 0,
        weights: 0,
        video: 0,
        audio: 0,
      },
    )
  }, [deliverables.deliverables])

  const filteredDeliverables = useMemo(() => {
    return deliverables.deliverables.filter((item) => {
      const matchesSearch =
        deferredSearchQuery.length === 0 ||
        [
          item.title,
          item.description,
          item.agentName,
          item.serviceTitle,
          item.fileName ?? "",
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(deferredSearchQuery)

      const matchesType = selectedType === "all" || item.type === selectedType
      const matchesStatus =
        selectedStatus === "all" || item.status === selectedStatus

      return matchesSearch && matchesType && matchesStatus
    })
  }, [deferredSearchQuery, deliverables.deliverables, selectedStatus, selectedType])

  return (
    <WalletRouteGuard
      title="Connect your account to inspect deliverables"
      description="Generated files, delivery bundles, and owner review drafts stay scoped to your workspace. Connect your wallet and switch to the AgentCommerce appchain to load them."
      secondaryHref="/marketplace"
      secondaryLabel="Explore Marketplace"
    >
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-display font-bold tracking-tight text-white">
              Deliverables
            </h1>
            <p className="max-w-2xl text-white/50">
              Manage every file, bundle, review draft, and final delivery generated by
              your agent services in one place.
            </p>
          </div>

          <Button
            variant="outline"
            className="h-11 border-white/10 bg-white/5"
            onClick={() => void deliverables.refetchAll()}
          >
            <RefreshCcw
              className={cn("mr-2 h-4 w-4", deliverables.isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        {!deliverables.auth.isAuthenticated ? (
          <StatusNoticeCard
            tone="warning"
            title="Unlock backend sync to load live deliverables"
            description="Your wallet is connected, but generated files and review drafts stay private to your backend session. Unlock backend sync once, then this page will populate automatically."
          />
        ) : null}

        {deliverables.recoveryNotice ? (
          <StatusNoticeCard
            tone="success"
            title="Recovered older deliverable records"
            description={deliverables.recoveryNotice}
          />
        ) : null}

        {deliverables.recoveryWarning ? (
          <StatusNoticeCard
            tone="warning"
            title="Some older orders still need another refresh"
            description={deliverables.recoveryWarning}
          />
        ) : null}

        {deliverables.isError && deliverables.errorMessage ? (
          <StatusNoticeCard
            tone="danger"
            title="Deliverables are temporarily unavailable"
            description={deliverables.errorMessage}
            actionLabel="Retry"
            onAction={() => deliverables.refetchAll()}
            isActionLoading={deliverables.isFetching}
          />
        ) : null}

        <Card className="glass-card border-white/5">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
                <CheckCircle2 className="h-4 w-4 text-indigo-300" />
              </div>
              <div>
                <p className="font-semibold text-white">{deliverables.backendNotice.title}</p>
                <p className="mt-1 text-sm text-white/45">
                  {deliverables.backendNotice.description}
                </p>
              </div>
            </div>

            <Button asChild className="h-10">
              <Link href="/dashboard/services/new">Create Service</Link>
            </Button>
          </CardContent>
        </Card>

        {deliverables.isFirstTimeUser ? (
          <Card className="glass-card border-white/5">
            <CardContent className="flex flex-col gap-8 p-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Deliverables Ready
                </div>
                <h2 className="mt-4 text-3xl font-display font-bold text-white">
                  Your deliverable workspace is waiting for the first handoff
                </h2>
                <p className="mt-3 text-white/50">
                  Once your agents start producing delivery bundles, exports, visuals,
                  code packs, or review drafts, they will appear here automatically.
                </p>
              </div>

              <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/30 p-6">
                <p className="text-sm font-semibold text-white">
                  Best next step
                </p>
                <p className="mt-2 text-sm text-white/45">
                  Create a service like a competitor brief, analytics export, or visual
                  campaign draft, then place one test order to seed live deliverables.
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <Button asChild>
                    <Link href="/dashboard/services/new">Create Service</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-white/10 bg-white/5">
                    <Link href="/marketplace">Explore Marketplace</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {deliverables.statCards.map((card) => (
                <Card key={card.label} className="glass-card border-white/5">
                  <CardContent className="space-y-3 p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">
                      {card.label}
                    </p>
                    <p className="text-3xl font-display font-bold text-white">{card.value}</p>
                    <p className="text-sm text-white/45">{card.caption}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search deliverables, formats, agents, or services..."
                    className="h-11 border-white/10 bg-black/40 pl-10"
                  />
                </div>

                <div className="relative w-full lg:w-[180px]">
                  <select
                    value={selectedType}
                    onChange={(event) =>
                      setSelectedType(event.target.value as DashboardDeliverableType | "all")
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-black/40 px-4 pr-10 text-sm text-white outline-none"
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                </div>

                <div className="relative w-full lg:w-[180px]">
                  <select
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value as DashboardDeliverableStatus | "all")
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-black/40 px-4 pr-10 text-sm text-white outline-none"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <div className="rounded-xl border border-white/10 bg-black/40 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "rounded-lg p-2 text-white/45 transition-colors",
                      viewMode === "grid" && "bg-white/10 text-white",
                    )}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "rounded-lg p-2 text-white/45 transition-colors",
                      viewMode === "list" && "bg-white/10 text-white",
                    )}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/70">
                All {deliverables.deliverables.length}
              </Badge>
              {typeOptions
                .filter((option) => option.value !== "all")
                .map((option) => (
                  <Badge
                    key={option.value}
                    variant="outline"
                    className={cn(
                      "border-white/10 bg-white/[0.03]",
                      selectedType === option.value ? "text-white" : "text-white/55",
                    )}
                  >
                    {option.label}{" "}
                    {typeCounts[option.value as DashboardDeliverableType]}
                  </Badge>
                ))}
            </div>

            {deliverables.isLoading ? (
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid gap-6 md:grid-cols-2 xl:grid-cols-3"
                    : "space-y-4",
                )}
              >
                {Array.from({ length: viewMode === "grid" ? 6 : 4 }).map((_, index) => (
                  <SkeletonBlock
                    key={index}
                    className={cn(
                      "glass-card",
                      viewMode === "grid" ? "h-[340px]" : "h-[140px]",
                    )}
                  />
                ))}
              </div>
            ) : filteredDeliverables.length === 0 ? (
              <div className="glass-card rounded-3xl border-white/5 p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                  <Search className="h-7 w-7 text-white/20" />
                </div>
                <h3 className="mt-6 text-xl font-display font-bold text-white">
                  {deliverables.deliverables.length === 0
                    ? "No deliverables yet"
                    : "No deliverables match these filters"}
                </h3>
                <p className="mx-auto mt-3 max-w-md text-white/45">
                  {deliverables.deliverables.length === 0
                    ? "When your services generate bundles, files, exports, or review drafts, they will show up here automatically."
                    : "Try a broader search or switch the type and status filters back to all."}
                </p>
                {deliverables.deliverables.length > 0 ? (
                  <Button
                    variant="outline"
                    className="mt-6 border-white/10 bg-white/5"
                    onClick={() => {
                      setSearchQuery("")
                      setSelectedType("all")
                      setSelectedStatus("all")
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredDeliverables.map((item) => (
                  <DeliverableGridCard
                    key={item.id}
                    item={item}
                    onPreview={setPreviewItem}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDeliverables.map((item) => (
                  <DeliverableListRow
                    key={item.id}
                    item={item}
                    onPreview={setPreviewItem}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <DeliverablePreviewDialog
        item={
          previewItem
            ? {
                title: previewItem.title,
                description: previewItem.description,
                type: previewItem.type,
                formatLabel: previewItem.formatLabel,
                previewUrl: previewItem.previewUrl,
                downloadUrl: previewItem.downloadUrl,
                fileName: previewItem.fileName,
                subtitle: previewItem.serviceTitle,
                agentName: previewItem.agentName,
                sourceLabel: previewItem.sourceLabel,
                dateLabel: previewItem.dateLabel,
              }
            : null
        }
        open={Boolean(previewItem)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewItem(null)
          }
        }}
      />
    </WalletRouteGuard>
  )
}
