"use client"

import { useMemo } from "react"
import { useAgents, useOwnerOrders, useTasks } from "@/hooks/api"
import { useBackendAuth } from "@/hooks/auth"
import {
  useRecoverMissingPayments,
  useRecoverPendingOrderSyncs,
} from "@/hooks/orders"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { getApiErrorMessage, isApiError } from "@/lib/api"
import type { AgentDto, OrderDto, TaskDto } from "@/lib/api/types"

export type DashboardDeliverableType =
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

export type DashboardDeliverableStatus =
  | "ready"
  | "processing"
  | "failed"
  | "review"

export type DashboardDeliverableItem = {
  id: string
  title: string
  description: string
  type: DashboardDeliverableType
  status: DashboardDeliverableStatus
  dateLabel: string
  timestamp: string
  agentName: string
  serviceTitle: string
  formatLabel: string
  sourceLabel: string
  artifactCount: number
  orderId: string
  orderHref: string
  downloadUrl: string | null
  previewUrl: string | null
  fileName: string | null
  tags: string[]
}

export type DashboardDeliverableStat = {
  label: string
  value: string
  caption: string
}

export type DashboardDeliverablesBackendNotice = {
  tone: "neutral" | "warning" | "danger" | "success"
  title: string
  description: string
}

type CandidateAsset = {
  id: string
  title: string | null
  url: string
  fileName: string | null
  contentType: string | null
  createdAt: string | null
  sourceLabel: string
}

function formatRelativeTime(timestamp: string) {
  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) {
    return "Just now"
  }

  const diffMs = value.getTime() - Date.now()
  const absoluteMinutes = Math.round(Math.abs(diffMs) / (60 * 1000))
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  if (absoluteMinutes < 1) {
    return "Just now"
  }

  if (absoluteMinutes < 60) {
    return formatter.format(Math.round(diffMs / (60 * 1000)), "minute")
  }

  const absoluteHours = Math.round(absoluteMinutes / 60)
  if (absoluteHours < 24) {
    return formatter.format(Math.round(diffMs / (60 * 60 * 1000)), "hour")
  }

  return formatter.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day")
}

function isIgnoredDashboardError(error: unknown) {
  return isApiError(error) && (error.status === 401 || error.status === 404)
}

function isAuthError(error: unknown) {
  return isApiError(error) && error.status === 401
}

function isMissingEndpointError(error: unknown) {
  return isApiError(error) && error.status === 404
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function parseMarkdownLinks(value: string | null | undefined) {
  if (!value) {
    return []
  }

  const links: Array<{ title: string; url: string }> = []
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)/g

  let match = pattern.exec(value)
  while (match) {
    const title = match[1]?.trim()
    const url = match[2]?.trim()

    if (title && url) {
      links.push({ title, url })
    }

    match = pattern.exec(value)
  }

  return links
}

function summarizeText(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const collapsed = value
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (collapsed.length === 0) {
    return null
  }

  return collapsed.slice(0, 180)
}

function getFileExtension(input: {
  url?: string | null
  fileName?: string | null
}) {
  const candidate = input.fileName ?? input.url ?? null
  if (!candidate) {
    return null
  }

  try {
    const url = candidate.includes("://")
      ? new URL(candidate)
      : new URL(candidate, "http://localhost")
    const lastSegment = url.pathname.split("/").pop() ?? ""
    const match = /\.([a-z0-9]+)$/i.exec(lastSegment)
    return match?.[1]?.toLowerCase() ?? null
  } catch {
    const match = /\.([a-z0-9]+)$/i.exec(candidate)
    return match?.[1]?.toLowerCase() ?? null
  }
}

function inferDeliverableType(input: {
  url?: string | null
  fileName?: string | null
  contentType?: string | null
  title?: string | null
  serviceTitle?: string | null
}): DashboardDeliverableType {
  const contentType = input.contentType?.toLowerCase() ?? null

  if (contentType?.startsWith("model/")) {
    return "model"
  }

  if (contentType?.startsWith("image/")) {
    return "design"
  }

  if (contentType?.startsWith("video/")) {
    return "video"
  }

  if (contentType?.startsWith("audio/")) {
    return "audio"
  }

  if (contentType === "text/html") {
    return "deployment"
  }

  if (
    contentType?.includes("spreadsheet") ||
    contentType?.includes("excel")
  ) {
    return "spreadsheet"
  }

  if (
    contentType === "application/json" ||
    contentType === "text/csv"
  ) {
    return "data"
  }

  if (
    contentType?.includes("presentation") ||
    contentType?.includes("powerpoint")
  ) {
    return "presentation"
  }

  if (
    contentType === "application/pdf" ||
    contentType?.includes("word") ||
    contentType?.includes("document") ||
    contentType?.includes("markdown") ||
    contentType?.startsWith("text/")
  ) {
    return "document"
  }

  const extension = getFileExtension(input)
  if (extension) {
    if (["glb", "gltf", "obj", "fbx", "stl", "usdz", "blend"].includes(extension)) {
      return "model"
    }
    if (["sol", "rs", "move"].includes(extension)) {
      return "contract"
    }
    if (["png", "jpg", "jpeg", "webp", "svg", "gif", "fig", "figma", "psd"].includes(extension)) {
      return "design"
    }
    if (["mp4", "mov", "avi", "webm", "mkv"].includes(extension)) {
      return "video"
    }
    if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(extension)) {
      return "audio"
    }
    if (["xlsx", "xls", "ods"].includes(extension)) {
      return "spreadsheet"
    }
    if (["ppt", "pptx", "odp", "key"].includes(extension)) {
      return "presentation"
    }
    if (["bin", "safetensors", "ckpt", "pt", "pth", "onnx", "gguf"].includes(extension)) {
      return "weights"
    }
    if (["html", "htm"].includes(extension)) {
      return "deployment"
    }
    if (["csv", "json", "parquet", "db", "sqlite", "sql"].includes(extension)) {
      return "data"
    }
    if (["js", "ts", "tsx", "jsx", "py", "go", "rs", "java", "sol", "move", "sh", "bash", "zip", "tar", "gz"].includes(extension)) {
      return "code"
    }
    if (["pdf", "doc", "docx", "md", "txt", "rtf", "html"].includes(extension)) {
      return "document"
    }
  }

  const keywordSource = [
    input.title ?? "",
    input.serviceTitle ?? "",
  ]
    .join(" ")
    .toLowerCase()

  if (/(voice|audio|podcast|narration|music)/.test(keywordSource)) {
    return "audio"
  }
  if (/(solidity|smart contract|staking contract|erc20|erc721|onchain|contract audit|rust contract)/.test(keywordSource)) {
    return "contract"
  }
  if (/(3d|model|mesh|render|asset pack|glb|gltf|stl)/.test(keywordSource)) {
    return "model"
  }
  if (/(website|landing page|frontend|web app|deployment|live preview|site preview)/.test(keywordSource)) {
    return "deployment"
  }
  if (/(weights|checkpoint|safetensors|finetune|trained model|embedding model|gguf|onnx)/.test(keywordSource)) {
    return "weights"
  }
  if (/(video|reel|teaser|motion|ad)/.test(keywordSource)) {
    return "video"
  }
  if (/(design|figma|visual|creative|banner|image|mockup)/.test(keywordSource)) {
    return "design"
  }
  if (/(spreadsheet|sheet|workbook|excel)/.test(keywordSource)) {
    return "spreadsheet"
  }
  if (/(presentation|deck|slides|pitch deck|powerpoint)/.test(keywordSource)) {
    return "presentation"
  }
  if (/(data|analytics|dataset|csv|json|reporting|export)/.test(keywordSource)) {
    return "data"
  }
  if (/(code|script|template|automation|integration|api|app)/.test(keywordSource)) {
    return "code"
  }

  return "document"
}

function inferFormatLabel(input: {
  url?: string | null
  fileName?: string | null
  contentType?: string | null
}) {
  const extension = getFileExtension(input)
  if (extension) {
    return extension.toUpperCase()
  }

  const contentType = input.contentType?.toLowerCase() ?? null
  if (!contentType) {
    return "LINK"
  }

  const simplified = contentType.split("/")[1] ?? contentType
  return simplified.replace(/[^a-z0-9]+/gi, " ").trim().slice(0, 12).toUpperCase() || "FILE"
}

function getDeliverableStatus(order: OrderDto, tasks: TaskDto[]): DashboardDeliverableStatus {
  const latestTask = [...tasks].sort((left, right) => {
    return Date.parse(right.updatedAt ?? right.createdAt) - Date.parse(left.updatedAt ?? left.createdAt)
  })[0] ?? null

  if (order.deliveryStatus === "AWAITING_REVIEW") {
    return "review"
  }

  if (
    order.status === "FAILED" ||
    order.deliveryStatus === "FAILED" ||
    latestTask?.status === "FAILED" ||
    latestTask?.status === "TIMED_OUT" ||
    latestTask?.status === "CANCELED"
  ) {
    return "failed"
  }

  if (
    order.status === "DELIVERED" ||
    order.status === "COMPLETED" ||
    order.deliveryStatus === "DELIVERED"
  ) {
    return "ready"
  }

  return "processing"
}

function shouldIncludeOrder(order: OrderDto, tasks: TaskDto[]) {
  if (order.delivery.url || order.delivery.text || order.deliveryVersions.length > 0) {
    return true
  }

  if (
    order.status === "IN_PROGRESS" ||
    order.status === "DELIVERED" ||
    order.status === "COMPLETED" ||
    order.status === "FAILED" ||
    order.deliveryStatus === "AWAITING_REVIEW" ||
    order.deliveryStatus === "FAILED"
  ) {
    return true
  }

  return tasks.length > 0
}

function buildFallbackDescription(order: OrderDto, status: DashboardDeliverableStatus) {
  if (status === "review") {
    return "A draft delivery is waiting for owner review before it becomes customer-visible."
  }

  if (status === "failed") {
    return "This deliverable needs attention before it can be handed off or downloaded."
  }

  if (status === "processing") {
    return "Fulfillment is still generating the deliverable package and downloadable outputs."
  }

  return "Customer-ready delivery package is available."
}

function extractGeneratedArtifacts(task: TaskDto): CandidateAsset[] {
  const output = getRecord(task.output)
  if (!output || !Array.isArray(output.generatedArtifacts)) {
    return []
  }

  return output.generatedArtifacts.flatMap((entry, index) => {
    const artifact = getRecord(entry)
    const url = getString(artifact?.url)

    if (!url) {
      return []
    }

    return [
      {
        id: `${task.id}:generated:${index}`,
        title: getString(artifact?.title) ?? getString(artifact?.fileName),
        url,
        fileName: getString(artifact?.fileName),
        contentType: getString(artifact?.contentType),
        createdAt: task.completedAt ?? task.updatedAt ?? task.createdAt,
        sourceLabel: "Generated artifact",
      },
    ]
  })
}

function collectOrderAssets(order: OrderDto, tasks: TaskDto[]) {
  const candidates: CandidateAsset[] = []

  if (order.delivery.url) {
    candidates.push({
      id: `${order.id}:delivery:current`,
      title: `${order.service.title} delivery bundle`,
      url: order.delivery.url,
      fileName: null,
      contentType: null,
      createdAt: order.delivery.deliveredAt ?? order.updatedAt,
      sourceLabel: "Current delivery",
    })
  }

  for (const link of parseMarkdownLinks(order.delivery.text)) {
    candidates.push({
      id: `${order.id}:delivery:${link.url}`,
      title: link.title,
      url: link.url,
      fileName: null,
      contentType: null,
      createdAt: order.delivery.deliveredAt ?? order.updatedAt,
      sourceLabel: "Current delivery",
    })
  }

  for (const version of order.deliveryVersions) {
    if (version.deliveryUrl) {
      candidates.push({
        id: `${order.id}:version:${version.id}:bundle`,
        title: `${order.service.title} v${version.versionNumber}`,
        url: version.deliveryUrl,
        fileName: null,
        contentType: null,
        createdAt: version.createdAt,
        sourceLabel: `Version ${version.versionNumber}`,
      })
    }

    for (const link of parseMarkdownLinks(version.deliveryText)) {
      candidates.push({
        id: `${order.id}:version:${version.id}:${link.url}`,
        title: link.title,
        url: link.url,
        fileName: null,
        contentType: null,
        createdAt: version.createdAt,
        sourceLabel: `Version ${version.versionNumber}`,
      })
    }
  }

  for (const task of tasks) {
    candidates.push(...extractGeneratedArtifacts(task))
  }

  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const identity = `${candidate.url.toLowerCase()}::${candidate.title?.toLowerCase() ?? ""}`
    if (seen.has(identity)) {
      return false
    }

    seen.add(identity)
    return true
  })
}

function buildDeliverableItems(orders: OrderDto[], tasks: TaskDto[]) {
  const tasksByOrderId = new Map<string, TaskDto[]>()

  for (const task of tasks) {
    if (!task.orderId) {
      continue
    }

    const current = tasksByOrderId.get(task.orderId) ?? []
    current.push(task)
    tasksByOrderId.set(task.orderId, current)
  }

  const items: DashboardDeliverableItem[] = []

  for (const order of orders) {
    const relatedTasks = tasksByOrderId.get(order.id) ?? []

    if (!shouldIncludeOrder(order, relatedTasks)) {
      continue
    }

    const status = getDeliverableStatus(order, relatedTasks)
    const assets = collectOrderAssets(order, relatedTasks)
    const baseDescription =
      summarizeText(order.delivery.text) ??
      summarizeText(order.deliveryVersions[0]?.deliveryText) ??
      summarizeText(order.customerNote) ??
      null

    if (assets.length === 0) {
      items.push({
        id: `${order.id}:workflow`,
        title: order.service.title,
        description: baseDescription ?? buildFallbackDescription(order, status),
        type: inferDeliverableType({
          title: order.service.title,
          serviceTitle: order.service.title,
        }),
        status,
        dateLabel: formatRelativeTime(order.updatedAt),
        timestamp: order.updatedAt,
        agentName: order.agent.name,
        serviceTitle: order.service.title,
        formatLabel: status === "review" ? "DRAFT" : "LIVE",
        sourceLabel: status === "review" ? "Owner review" : "Workflow",
        artifactCount: 0,
        orderId: order.id,
        orderHref: `/orders/${order.id}?role=agent_owner`,
        downloadUrl: null,
        previewUrl: null,
        fileName: null,
        tags: [order.service.title, order.status.toLowerCase()],
      })
      continue
    }

    for (const asset of assets) {
      const fileType = inferDeliverableType({
        url: asset.url,
        fileName: asset.fileName,
        contentType: asset.contentType,
        title: asset.title,
        serviceTitle: order.service.title,
      })

      items.push({
        id: asset.id,
        title: asset.title ?? order.service.title,
        description:
          baseDescription ??
          `${asset.sourceLabel} for ${order.service.title} by ${order.agent.name}.`,
        type: fileType,
        status,
        dateLabel: formatRelativeTime(asset.createdAt ?? order.updatedAt),
        timestamp: asset.createdAt ?? order.updatedAt,
        agentName: order.agent.name,
        serviceTitle: order.service.title,
        formatLabel: inferFormatLabel({
          url: asset.url,
          fileName: asset.fileName,
          contentType: asset.contentType,
        }),
        sourceLabel: asset.sourceLabel,
        artifactCount: assets.length,
        orderId: order.id,
        orderHref: `/orders/${order.id}?role=agent_owner`,
        downloadUrl: asset.url,
        previewUrl: asset.url,
        fileName: asset.fileName,
        tags: [
          order.service.title,
          asset.sourceLabel,
          status === "ready"
            ? "Ready"
            : status === "review"
              ? "Review"
              : status === "failed"
                ? "Failed"
                : "Processing",
        ],
      })
    }
  }

  return items.sort(
    (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp),
  )
}

function buildStatCards(input: {
  items: DashboardDeliverableItem[]
  agents: AgentDto[]
}) {
  const ready = input.items.filter((item) => item.status === "ready").length
  const review = input.items.filter((item) => item.status === "review").length
  const processing = input.items.filter((item) => item.status === "processing").length
  const activeAgents =
    new Set(input.items.map((item) => item.agentName)).size ||
    input.agents.filter((agent) => agent.status === "ACTIVE").length

  return [
    {
      label: "Total Deliverables",
      value: new Intl.NumberFormat().format(input.items.length),
      caption: "Indexed outputs and delivery bundles",
    },
    {
      label: "Ready to Download",
      value: new Intl.NumberFormat().format(ready),
      caption: "Customer-ready artifacts and delivery links",
    },
    {
      label: "Awaiting Review",
      value: new Intl.NumberFormat().format(review),
      caption:
        review > 0
          ? "Drafts waiting for owner sign-off"
          : "No draft packages waiting right now",
    },
    {
      label: "Active Pipeline",
      value: new Intl.NumberFormat().format(processing),
      caption: `${activeAgents} agent${activeAgents === 1 ? "" : "s"} shipping outputs`,
    },
  ] satisfies DashboardDeliverableStat[]
}

export function useDashboardDeliverables() {
  const wallet = useWalletConnectionFlow()
  const auth = useBackendAuth()
  const queriesEnabled = wallet.isConnected && auth.isAuthenticated

  const agentsQuery = useAgents(
    {
      ownerId: auth.currentSession?.user.id,
      page: 1,
      pageSize: 50,
    },
    {
      enabled: queriesEnabled,
    },
  )
  const ownerOrdersQuery = useOwnerOrders(
    auth.currentSession?.user.id,
    {
      page: 1,
      pageSize: 50,
    },
    {
      enabled: queriesEnabled,
    },
  )
  const tasksQuery = useTasks(
    {
      ownerId: auth.currentSession?.user.id ?? undefined,
      page: 1,
      pageSize: 100,
    },
    {
      enabled: queriesEnabled,
    },
  )

  const agents = agentsQuery.data?.data ?? []
  const ownerOrders = ownerOrdersQuery.data?.data ?? []
  const tasks = tasksQuery.data?.data ?? []

  const pendingOrderSyncRecovery = useRecoverPendingOrderSyncs({
    enabled: queriesEnabled,
  })
  const paymentRecovery = useRecoverMissingPayments({
    orders: ownerOrders,
    enabled: queriesEnabled,
  })

  const deliverables = useMemo(
    () => buildDeliverableItems(ownerOrders, tasks),
    [ownerOrders, tasks],
  )

  const statCards = useMemo(
    () =>
      buildStatCards({
        items: deliverables,
        agents,
      }),
    [agents, deliverables],
  )

  const queries = [agentsQuery, ownerOrdersQuery, tasksQuery]
  const isLoading =
    queriesEnabled &&
    queries.every((query) => query.isLoading || query.isPending)
  const isFetching = queriesEnabled && queries.some((query) => query.isFetching)

  const authBlocking = queries.some((query) => isAuthError(query.error))
  const missingSections = [
    isMissingEndpointError(agentsQuery.error) ? "agents" : null,
    isMissingEndpointError(ownerOrdersQuery.error) ? "orders" : null,
    isMissingEndpointError(tasksQuery.error) ? "tasks" : null,
  ].filter((value): value is string => Boolean(value))
  const hardError = queries.find(
    (query) => query.isError && !isIgnoredDashboardError(query.error),
  )?.error

  const hasAnyData =
    agents.length > 0 || ownerOrders.length > 0 || tasks.length > 0 || deliverables.length > 0

  const isFirstTimeUser =
    queriesEnabled &&
    !isLoading &&
    !isFetching &&
    !authBlocking &&
    !hardError &&
    missingSections.length === 0 &&
    !hasAnyData

  const backendNotice: DashboardDeliverablesBackendNotice = useMemo(() => {
    if (!wallet.isConnected) {
      return {
        tone: "neutral",
        title: "Connect your account to load deliverables",
        description:
          "Deliverable packages are scoped to your workspace. Connect your wallet to load them here.",
      }
    }

    if (!auth.isAuthenticated) {
      return {
        tone: "warning",
        title: "Unlock backend sync to load your deliverables",
        description:
          "Sign one wallet message to scope generated files, review drafts, and delivery history to your account.",
      }
    }

    if (hardError) {
      return {
        tone: "danger",
        title: "Deliverables are temporarily unavailable",
        description: getApiErrorMessage(hardError),
      }
    }

    if (authBlocking) {
      return {
        tone: "warning",
        title: "Deliverables still need a fresh backend session",
        description:
          "Your wallet is connected, but the backend session for workspace data needs to be refreshed.",
      }
    }

    if (missingSections.length > 0) {
      return {
        tone: "warning",
        title: "Some deliverable sources are missing on this deployment",
        description: `This environment is still missing ${missingSections.join(", ")} routes, so some artifacts may not appear yet.`,
      }
    }

    return {
      tone: "success",
      title: "Live deliverables are connected",
      description:
        "Delivery bundles, generated artifacts, and owner review drafts are flowing through this workspace.",
    }
  }, [auth.isAuthenticated, authBlocking, hardError, missingSections, wallet.isConnected])

  const refetchAll = async () => {
    if (!queriesEnabled) {
      return
    }

    await Promise.all([
      agentsQuery.refetch(),
      ownerOrdersQuery.refetch(),
      tasksQuery.refetch(),
    ])
  }

  return {
    wallet,
    auth,
    agents,
    ownerOrders,
    tasks,
    deliverables,
    statCards,
    backendNotice,
    isLoading,
    isFetching,
    isFirstTimeUser,
    recoveryNotice: pendingOrderSyncRecovery.notice ?? paymentRecovery.notice,
    recoveryWarning: pendingOrderSyncRecovery.warning ?? paymentRecovery.warning,
    isError: Boolean(hardError),
    errorMessage: hardError ? getApiErrorMessage(hardError) : null,
    refetchAll,
  }
}
