"use client"

import Link from "next/link"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  MessageSquareQuote,
  Paperclip,
  TriangleAlert,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AgentServiceDto, OrderReference } from "@/lib/api/types"
import { buildCheckoutHref } from "@/lib/orders/checkout"
import { buildCheckoutBriefCoachPlan } from "@/lib/orders/brief-coach"
import {
  getServiceDeliverableDefinitionFromMetadata,
} from "@/lib/services/deliverable-profile"
import { getServiceExecutionModeDefinition, getServiceExecutionMode } from "@/lib/services/execution-mode"

export function CheckoutBriefCoach({
  serviceTitle,
  serviceDescription,
  service,
  availableServices,
  customerNote,
  customerReferences,
  onInsertPrompt,
  onOpenUpload,
}: {
  serviceTitle: string
  serviceDescription: string | null
  service?: AgentServiceDto | null
  availableServices?: AgentServiceDto[]
  customerNote: string
  customerReferences: OrderReference[]
  onInsertPrompt: (value: string) => void
  onOpenUpload: () => void
}) {
  const plan = buildCheckoutBriefCoachPlan({
    serviceTitle,
    serviceDescription,
    service,
    availableServices,
    customerNote,
    customerReferences,
  })

  const badgeVariant =
    plan.status === "ready"
      ? "success"
      : plan.status === "wrong_service"
        ? "destructive"
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
                AgentCommerce Intake Assistant
              </p>
              <p className="text-sm text-white/45">
                I will help tighten this brief before payment.
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
                ) : message.id === "service-mismatch" ? (
                  <TriangleAlert className="h-4 w-4 text-amber-300" />
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

      {plan.serviceFit === "mismatch" && plan.recommendedServices.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100/80">
            Better Service Matches
          </p>
          <p className="mt-2 text-sm text-white/60">
            These live services look closer to the job you described.
          </p>

          <div className="mt-4 space-y-3">
            {plan.recommendedServices.map((recommendation) => {
              const agent = recommendation.service.agent
              const href = agent
                ? buildCheckoutHref({
                    agent: {
                      id: agent.id,
                      name: agent.name,
                      slug: agent.slug,
                      treasuryAddress: agent.treasuryAddress,
                    },
                    service: recommendation.service,
                  })
                : `/marketplace`
              const executionMode = getServiceExecutionMode(
                recommendation.service.metadata,
              )
              const executionModeLabel =
                getServiceExecutionModeDefinition(executionMode).label
              const deliverableLabel =
                getServiceDeliverableDefinitionFromMetadata(
                  recommendation.service.metadata,
                ).label

              return (
                <div
                  key={recommendation.service.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {recommendation.service.title}
                      </p>
                      <p className="mt-1 text-sm text-white/45">
                        {agent?.name ?? "AgentCommerce service"}
                      </p>
                    </div>

                    <Badge variant="outline" className="border-white/10 text-[10px] uppercase tracking-[0.18em] text-white/70">
                      {recommendation.archetypeLabel}
                    </Badge>
                  </div>

                  <p className="mt-3 text-sm text-white/60">
                    {recommendation.reason}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/65">
                      {deliverableLabel}
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/65">
                      {executionModeLabel}
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button asChild type="button" variant="outline" className="border-white/10 bg-white/5">
                      <Link href={href}>
                        Switch to this service
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
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
              If you have any of these, attach them now for a better first pass.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-white/5"
            onClick={onOpenUpload}
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Upload Supporting Files
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
