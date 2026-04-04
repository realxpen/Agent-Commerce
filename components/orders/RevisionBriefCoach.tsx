"use client"

import { Bot, CheckCircle2, MessageSquareQuote, Paperclip } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AgentServiceDto, OrderReference } from "@/lib/api/types"
import { buildRevisionBriefCoachPlan } from "@/lib/orders/brief-coach"

export function RevisionBriefCoach({
  serviceTitle,
  serviceDescription,
  service,
  serviceMetadata,
  originalCustomerNote,
  originalCustomerReferences,
  revisionNote,
  revisionReferences,
  onInsertPrompt,
  onOpenUpload,
}: {
  serviceTitle: string
  serviceDescription: string | null
  service?: AgentServiceDto | null
  serviceMetadata?: AgentServiceDto["metadata"] | null
  originalCustomerNote?: string | null
  originalCustomerReferences?: OrderReference[]
  revisionNote: string
  revisionReferences: OrderReference[]
  onInsertPrompt: (value: string) => void
  onOpenUpload: () => void
}) {
  const plan = buildRevisionBriefCoachPlan({
    serviceTitle,
    serviceDescription,
    service,
    serviceMetadata,
    originalCustomerNote,
    originalCustomerReferences,
    revisionNote,
    revisionReferences,
  })

  const badgeVariant =
    plan.status === "ready"
      ? "success"
      : plan.status === "needs_context"
        ? "warning"
        : "outline"

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
              <Bot className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                AgentCommerce Revision Assistant
              </p>
              <p className="text-sm text-white/45">
                I will help make this revision request clearer before it is sent.
              </p>
            </div>
          </div>
        </div>

        <Badge
          variant={badgeVariant}
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
        >
          {plan.statusLabel}
        </Badge>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
        {plan.summary}
      </div>

      <div className="mt-4 space-y-3">
        {plan.messages.map((message) => (
          <div
            key={message.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30">
                {message.tone === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                ) : (
                  <MessageSquareQuote className="h-4 w-4 text-indigo-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{message.title}</p>
                <p className="mt-1 text-sm text-white/60">{message.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {plan.actions.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
            Quick Insert Prompts
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.actions.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-xs"
                onClick={() => onInsertPrompt(action.text)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Helpful Attachments
            </p>
            <p className="mt-2 text-sm text-white/55">
              Attach anything new that should influence the revised delivery.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-white/5"
            onClick={onOpenUpload}
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Add Revision Files
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {plan.suggestedAttachments.map((item) => (
            <div
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/65"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
