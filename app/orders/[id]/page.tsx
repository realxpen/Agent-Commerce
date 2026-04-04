"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useRef, type ChangeEvent } from "react"
import {
  AudioLines,
  ArrowRightLeft,
  Clock3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Package,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Video,
} from "lucide-react"
import { HeaderBackLink } from "@/components/layout/HeaderBackLink"
import { OrderDeliveryWorkspace } from "@/components/orders/OrderDeliveryWorkspace"
import { OrderLifecycleTimeline } from "@/components/orders/OrderLifecycleTimeline"
import { OrderNextActionCard } from "@/components/orders/OrderNextActionCard"
import { RevisionBriefCoach } from "@/components/orders/RevisionBriefCoach"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useOrderDetail } from "@/hooks/orders"
import { getApiErrorMessage } from "@/lib/api"
import type { JsonValue } from "@/lib/api/types"
import { buildRevisionBriefCoachPlan } from "@/lib/orders/brief-coach"

function isRecord(value: JsonValue | null | undefined): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readServiceSummary(snapshot: JsonValue) {
  if (!isRecord(snapshot)) {
    return {
      description: null,
    }
  }

  return {
    description:
      typeof snapshot.description === "string" ? snapshot.description : null,
  }
}

function getReferenceIcon(type: "image" | "video" | "audio" | "document" | "link") {
  switch (type) {
    case "image":
      return ImageIcon
    case "video":
      return Video
    case "audio":
      return AudioLines
    case "document":
      return FileText
    case "link":
    default:
      return Link2
  }
}

function getStatusBadgeTone(
  value: string,
): "success" | "warning" | "destructive" | "outline" {
  if (
    value === "COMPLETED" ||
    value === "PAID" ||
    value === "CONFIRMED" ||
    value === "DELIVERED" ||
    value === "FINALIZED" ||
    value === "SUCCEEDED" ||
    value === "ADDRESSED"
  ) {
    return "success"
  }

  if (
    value === "PENDING" ||
    value === "IN_PROGRESS" ||
    value === "UNCONFIRMED" ||
    value === "CONFIRMING" ||
    value === "INITIATED" ||
    value === "QUEUED" ||
    value === "RUNNING" ||
    value === "RETRYING" ||
    value === "OPEN" ||
    value === "ADDRESSING"
  ) {
    return "warning"
  }

  if (
    value === "FAILED" ||
    value === "CANCELLED" ||
    value === "REFUNDED" ||
    value === "CANCELED" ||
    value === "TIMED_OUT"
  ) {
    return "destructive"
  }

  return "outline"
}

const referenceTypeOptions = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "Document" },
  { value: "link", label: "Link" },
] as const

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const revisionFileInputRef = useRef<HTMLInputElement | null>(null)
  const detail = useOrderDetail({
    orderId: params.id,
    searchParams,
  })

  const backHref =
    detail.viewerRole === "customer"
      ? "/orders"
      : detail.viewerRole === "agent_owner"
        ? "/dashboard"
        : "/marketplace"
  const backLabel =
    detail.viewerRole === "customer"
      ? "Back to My Orders"
      : detail.viewerRole === "agent_owner"
        ? "Back to Dashboard"
        : "Back to Marketplace"

  const serviceSummary = detail.order
    ? readServiceSummary(detail.order.service.snapshot)
    : { description: null }
  const serviceMetadata =
    detail.order && isRecord(detail.order.service.snapshot) && isRecord(detail.order.service.snapshot.metadata)
      ? detail.order.service.snapshot.metadata
      : null
  const revisionCoachPlan = buildRevisionBriefCoachPlan({
    serviceTitle: detail.serviceTitle,
    serviceDescription: serviceSummary.description,
    serviceMetadata,
    originalCustomerNote: detail.order?.customerNote ?? null,
    originalCustomerReferences: detail.order?.customerReferences ?? [],
    revisionNote: detail.revisionNoteInput,
    revisionReferences: detail.revisionReferencesInput,
  })

  const handleRevisionFileSelection = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) {
      return
    }

    const files = Array.from(fileList)
    event.target.value = ""

    try {
      await detail.uploadRevisionReferences(files)
    } catch {
      // Upload errors are surfaced through the existing banner state.
    }
  }

  const appendRevisionPrompt = (value: string) => {
    const trimmedCurrent = detail.revisionNoteInput.trim()
    const trimmedValue = value.trim()
    detail.setRevisionNoteInput(
      trimmedCurrent ? `${trimmedCurrent}\n\n${trimmedValue}` : trimmedValue,
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <HeaderBackLink href={backHref} label={backLabel} className="w-fit" />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,420px)] 2xl:grid-cols-[minmax(0,1.8fr)_minmax(360px,440px)]">
        <div className="space-y-8">
          <Card className="glass-card border-white/5">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border-indigo-500/20 bg-indigo-500/10 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">
                  Order Detail
                </Badge>
                <Badge
                  variant={getStatusBadgeTone(detail.lifecycleStatus)}
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                >
                  {detail.lifecycleStatus}
                </Badge>
                <Badge
                  variant={getStatusBadgeTone(detail.paymentStatus)}
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                >
                  Payment {detail.paymentStatus}
                </Badge>
              </div>

              <div className="space-y-3">
                <CardTitle className="text-3xl font-display font-bold">
                  {detail.serviceTitle}
                </CardTitle>
                <p className="text-lg text-indigo-300">{detail.agentName}</p>
                <p className="max-w-3xl text-white/50">
                  {serviceSummary.description ??
                    "This page keeps the payment, delivery, and next-step flow visible from one place."}
                </p>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                  Service Summary
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {detail.serviceTitle}
                </p>
                <p className="mt-2 text-sm text-white/45">
                  Agent: {detail.agentName}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                  Payment
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {detail.amountLabel ?? "Payment amount not available in this view"}
                </p>
                <p className="mt-2 text-sm text-white/45">
                  Status: {detail.paymentStatus}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                  Delivery Status
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {detail.deliveryStatus}
                </p>
                <p className="mt-2 text-sm text-white/45">
                  Order status: {detail.lifecycleStatus}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                  Payment Reference
                </p>
                <p className="mt-2 break-all text-sm font-semibold text-white">
                  {detail.order?.payment.reference ??
                    detail.primaryTransaction?.paymentReference ??
                    "Not available in this view yet"}
                </p>
              </div>

              {detail.txHash ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Transaction Hash
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-white/65">
                    {detail.txHash}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {detail.orderQuery.isError && !detail.isPendingOnly ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              {getApiErrorMessage(detail.orderQuery.error)}
            </div>
          ) : null}

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-display font-bold">
                <ReceiptText className="h-5 w-5 text-indigo-400" />
                Order Lifecycle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderLifecycleTimeline
                status={detail.lifecycleStatus}
                paymentStatus={detail.paymentStatus}
                deliveryStatus={detail.deliveryStatus}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.95fr)]">
            <div className="space-y-6">
              <OrderDeliveryWorkspace
                deliveryUrl={detail.order?.delivery.url}
                deliveryText={detail.order?.delivery.text}
                deliveredAt={detail.order?.delivery.deliveredAt}
                status={detail.order?.status}
                deliveryStatus={detail.deliveryStatus}
                deliveryVersions={detail.order?.deliveryVersions ?? []}
                revisionRequests={detail.revisionRequests}
                agentName={detail.agentName}
                serviceTitle={detail.serviceTitle}
              />

              <Card className="glass-card border-white/5">
                <CardHeader>
                  <CardTitle className="text-xl font-display font-bold">
                    Customer Brief
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                    {detail.order?.customerNote ? (
                      <p className="whitespace-pre-wrap">{detail.order.customerNote}</p>
                    ) : (
                      <p>
                        The customer did not add a written brief for this order.
                      </p>
                    )}
                  </div>

                  {detail.order?.customerReferences.length ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                        Reference Materials
                      </p>

                      <div className="grid gap-3 md:grid-cols-2">
                        {detail.order.customerReferences.map((reference, index) => {
                          const ReferenceIcon = getReferenceIcon(reference.type)

                          return (
                            <div
                              key={`${reference.url}-${index}`}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                    <ReferenceIcon className="h-4 w-4 text-indigo-300" />
                                    <span>{reference.label}</span>
                                  </div>
                                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                                    {reference.source === "upload"
                                      ? `${reference.type} • uploaded file`
                                      : reference.type}
                                  </p>
                                </div>

                                <Link
                                  href={reference.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Open
                                </Link>
                              </div>

                              <p className="mt-3 break-all text-sm text-white/50">
                                {reference.url}
                              </p>

                              {reference.note ? (
                                <p className="mt-3 text-sm text-white/65">
                                  {reference.note}
                                </p>
                              ) : null}

                              {reference.previewText ? (
                                <div className="mt-3 rounded-xl border border-white/8 bg-black/25 p-3">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                    Preview
                                  </p>
                                  <p className="mt-2 line-clamp-4 text-sm text-white/60">
                                    {reference.previewText}
                                  </p>
                                </div>
                              ) : null}

                              {reference.source === "upload" ? (
                                <p className="mt-3 text-xs text-white/45">
                                  {reference.fileName ?? reference.label}
                                  {typeof reference.sizeBytes === "number"
                                    ? ` • ${Math.max(1, Math.round(reference.sizeBytes / 1024))} KB`
                                    : ""}
                                  {reference.contentType
                                    ? ` • ${reference.contentType}`
                                    : ""}
                                </p>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader>
                  <CardTitle className="text-xl font-display font-bold">
                    Commerce Transparency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="font-semibold text-white">
                          Clear payment visibility
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          The payment status, transaction hash, and backend order
                          state live together here so the flow feels understandable
                          instead of opaque.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-5 w-5 text-indigo-400" />
                      <div>
                        <p className="font-semibold text-white">
                          Backend indexing can lag behind chain confirmation
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          The transaction hash often lands before the richer
                          backend order fields. If some sections are empty, the
                          chain transaction may be ahead of the indexed record.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-display font-bold">
                <ArrowRightLeft className="h-5 w-5 text-indigo-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.primaryTransaction ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Latest Payment Update
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {detail.primaryTransaction.amount}{" "}
                    {detail.primaryTransaction.currency ??
                      detail.primaryTransaction.denom}
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    {detail.primaryTransaction.status} /{" "}
                    {detail.primaryTransaction.confirmationStatus}
                  </p>
                </div>
              ) : null}

              {detail.tasks.length > 0 ? (
                <div className="space-y-3">
                  {detail.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">
                            {task.agentTask.name}
                          </p>
                          <p className="mt-1 text-sm text-white/45">
                            {task.status} - Attempt {task.attemptNumber} of{" "}
                            {task.maxAttempts}
                          </p>
                        </div>
                        <Badge
                          variant={getStatusBadgeTone(task.status)}
                          className="text-[10px] font-bold uppercase tracking-[0.18em]"
                        >
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !detail.primaryTransaction ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                  <div className="flex items-start gap-3">
                    <Package className="mt-0.5 h-5 w-5 text-indigo-400" />
                    <div>
                      <p className="font-semibold text-white">
                        No indexed activity yet
                      </p>
                      <p className="mt-1">
                        This order does not have indexed payment or task
                        activity records available yet.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8 xl:sticky xl:top-8 xl:self-start">
          <OrderNextActionCard
            viewerRole={detail.viewerRole}
            viewerRoleLabel={detail.viewerRoleLabel}
            viewerRoleDescription={detail.viewerRoleDescription}
            nextAction={detail.nextAction}
            deliveryUrlInput={detail.deliveryUrlInput}
            onDeliveryUrlChange={detail.setDeliveryUrlInput}
            deliveryTextInput={detail.deliveryTextInput}
            onDeliveryTextChange={detail.setDeliveryTextInput}
            onMarkInProgress={detail.markInProgress}
            onResumeFulfillment={detail.resumeFulfillment}
            onMarkDelivered={detail.markDelivered}
            onConfirmCompletion={detail.confirmCompletion}
            isResumingFulfillment={detail.isResumingFulfillment}
            activeTransaction={detail.activeContractAction}
            deliverableUploadHint={
              detail.canUploadOwnerDeliverables
                ? detail.deliverableUploadHint
                : undefined
            }
            onUploadDeliverables={
              detail.canUploadOwnerDeliverables
                ? detail.uploadOwnerDeliverables
                : undefined
            }
            isUploadingDeliverables={
              detail.canUploadOwnerDeliverables
                ? detail.isUploadingOwnerDeliverables
                : false
            }
            deliverableUploadError={
              detail.canUploadOwnerDeliverables
                ? detail.ownerDeliverableUploadError
                : undefined
            }
            actionNotice={detail.actionNotice}
            actionWarning={detail.actionWarning}
          />

          {detail.viewerRole === "agent_owner" && detail.canResubmitRevisionDraft ? (
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="text-xl font-display font-bold">
                  Need another draft pass?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/60">
                  Requeue this order on the same paid order record so AgentCommerce can
                  generate another draft using the current brief, files, and latest
                  revision context.
                </p>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={detail.isResubmittingRevisionDraft}
                  onClick={() => void detail.resubmitRevisionDraft()}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {detail.isResubmittingRevisionDraft
                    ? "Resubmitting Draft..."
                    : "Resubmit Draft"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {detail.viewerRole === "customer" &&
          !detail.canRequestRevision &&
          !detail.activeRevisionRequest &&
          detail.order &&
          detail.order.status !== "DELIVERED" &&
          detail.order.status !== "COMPLETED" ? (
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="text-xl font-display font-bold">
                  Revisions open after delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/60">
                  Customers can request changes only after the agent submits a
                  delivery. Right now this order is still moving through
                  payment or fulfillment, so the revision form stays hidden
                  until something is ready to review.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {detail.viewerRole === "customer" &&
          !detail.canRequestRevision &&
          !detail.activeRevisionRequest &&
          detail.order?.status === "COMPLETED" ? (
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="text-xl font-display font-bold">
                  Revisions are closed for this order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/60">
                  This order has already been confirmed as complete. If you
                  want another round of work, the next step is placing a new
                  order rather than opening a revision on this finished one.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {detail.viewerRole === "customer" &&
          (detail.canRequestRevision ||
            detail.activeRevisionRequest ||
            detail.revisionRequestError) ? (
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="text-xl font-display font-bold">
                  Request Changes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {detail.activeRevisionRequest ? (
                  <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-indigo-100">
                    AgentCommerce is already processing your latest revision request.
                  </div>
                ) : null}

                {detail.canRequestRevision ? (
                  <>
                    <input
                      ref={revisionFileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(event) => {
                        void handleRevisionFileSelection(event)
                      }}
                    />

                    <textarea
                      className="min-h-28 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-white/25"
                      placeholder="Describe exactly what should change in the delivery."
                      value={detail.revisionNoteInput}
                      onChange={(event) => detail.setRevisionNoteInput(event.target.value)}
                    />

                    <RevisionBriefCoach
                      serviceTitle={detail.serviceTitle}
                      serviceDescription={serviceSummary.description}
                      serviceMetadata={serviceMetadata}
                      originalCustomerNote={detail.order?.customerNote ?? null}
                      originalCustomerReferences={detail.order?.customerReferences ?? []}
                      revisionNote={detail.revisionNoteInput}
                      revisionReferences={detail.revisionReferencesInput}
                      onInsertPrompt={appendRevisionPrompt}
                      onOpenUpload={() => {
                        detail.clearRevisionReferenceUploadError()
                        revisionFileInputRef.current?.click()
                      }}
                    />

                    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                            Add Missing Sources
                          </p>
                          <p className="mt-2 text-sm text-white/55">
                            Attach the competitor links, PDFs, screenshots, or files the agent asked for. These will be added to the order references for the next draft.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 bg-white/5"
                            onClick={() => {
                              detail.clearRevisionReferenceUploadError()
                              revisionFileInputRef.current?.click()
                            }}
                            disabled={
                              detail.revisionReferencesInput.length >= 8 ||
                              detail.isUploadingRevisionReferences
                            }
                          >
                            {detail.isUploadingRevisionReferences ? "Uploading..." : "Upload File"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 bg-white/5"
                            onClick={() => detail.addRevisionReference()}
                            disabled={detail.revisionReferencesInput.length >= 8}
                          >
                            Add Link
                          </Button>
                        </div>
                      </div>

                      {detail.revisionReferenceUploadError ? (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                          {detail.revisionReferenceUploadError}
                        </div>
                      ) : null}

                      {detail.revisionReferencesInput.length > 0 ? (
                        <div className="space-y-3">
                          {detail.revisionReferencesInput.map((reference, index) => {
                            const ReferenceIcon = getReferenceIcon(reference.type)

                            return (
                              <div
                                key={`${reference.source ?? "link"}-${reference.url}-${index}`}
                                className="rounded-2xl border border-white/10 bg-black/20 p-4"
                              >
                                <div className="mb-4 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                    <ReferenceIcon className="h-4 w-4 text-indigo-300" />
                                    <span>Revision Reference {index + 1}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-white/50 hover:text-white"
                                    onClick={() => detail.removeRevisionReference(index)}
                                  >
                                    Remove
                                  </Button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                                      Type
                                    </label>
                                    <select
                                      value={reference.type}
                                      onChange={(event) =>
                                        detail.updateRevisionReference(
                                          index,
                                          "type",
                                          event.target.value,
                                        )
                                      }
                                      className="flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none"
                                    >
                                      {referenceTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                                      Title
                                    </label>
                                    <input
                                      value={reference.label}
                                      onChange={(event) =>
                                        detail.updateRevisionReference(
                                          index,
                                          "label",
                                          event.target.value,
                                        )
                                      }
                                      className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/20"
                                      placeholder="Competitor homepage, pricing PDF, market screenshot..."
                                    />
                                  </div>
                                </div>

                                <div className="mt-4 space-y-2">
                                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                                    {reference.source === "upload" ? "Stored File URL" : "URL"}
                                  </label>
                                  <input
                                    value={reference.url}
                                    onChange={(event) =>
                                      detail.updateRevisionReference(
                                        index,
                                        "url",
                                        event.target.value,
                                      )
                                    }
                                    readOnly={reference.source === "upload"}
                                    className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/20"
                                    placeholder="https://competitor.com or a source link"
                                  />
                                </div>

                                <div className="mt-4 space-y-2">
                                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                                    Context
                                  </label>
                                  <textarea
                                    value={reference.note ?? ""}
                                    onChange={(event) =>
                                      detail.updateRevisionReference(
                                        index,
                                        "note",
                                        event.target.value,
                                      )
                                    }
                                    className="min-h-24 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/20"
                                    placeholder="Explain why this source matters for the revision."
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/50">
                          Add the missing competitor URLs, screenshots, PDFs, or notes here if the delivery asked for more source material.
                        </div>
                      )}
                    </div>

                    {detail.revisionRequestError ? (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                        {detail.revisionRequestError}
                      </div>
                    ) : null}

                    <Button
                      className="w-full"
                      disabled={
                        detail.isRequestingRevision || !revisionCoachPlan.isCheckoutReady
                      }
                      onClick={() => void detail.requestRevision()}
                    >
                      {detail.isRequestingRevision
                        ? "Sending revision request..."
                        : "Request Revision"}
                    </Button>
                    {!revisionCoachPlan.isCheckoutReady ? (
                      <p className="text-sm text-amber-200">
                        {revisionCoachPlan.blockingMessage}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
