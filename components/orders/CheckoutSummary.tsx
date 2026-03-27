"use client"

import {
  Clock3,
  FileText,
  Image as ImageIcon,
  Link2,
  Plus,
  Receipt,
  ShieldCheck,
  Trash2,
  Video,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CheckoutContext } from "@/lib/orders/checkout"
import type { OrderReference, OrderReferenceType } from "@/lib/api/types"

const referenceTypeOptions: Array<{
  value: OrderReferenceType
  label: string
}> = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "link", label: "Link" },
]

function createEmptyReference(): OrderReference {
  return {
    type: "link",
    label: "",
    url: "",
    note: null,
  }
}

function getReferenceTypeIcon(type: OrderReferenceType) {
  switch (type) {
    case "image":
      return ImageIcon
    case "video":
      return Video
    case "document":
      return FileText
    case "link":
    default:
      return Link2
  }
}

export function CheckoutSummary({
  checkout,
  customerNote,
  onCustomerNoteChange,
  customerReferences,
  onCustomerReferencesChange,
}: {
  checkout: CheckoutContext
  customerNote: string
  onCustomerNoteChange: (value: string) => void
  customerReferences: OrderReference[]
  onCustomerReferencesChange: (value: OrderReference[]) => void
}) {
  const priceLabel = checkout.currency
    ? `${checkout.displayAmount} ${checkout.currency}`
    : `${checkout.displayAmount} ${checkout.denom}`

  const addReference = () => {
    onCustomerReferencesChange([...customerReferences, createEmptyReference()])
  }

  const updateReference = (
    index: number,
    field: keyof OrderReference,
    value: string,
  ) => {
    onCustomerReferencesChange(
      customerReferences.map((reference, referenceIndex) =>
        referenceIndex === index
          ? {
              ...reference,
              [field]: field === "note" ? (value || null) : value,
            }
          : reference,
      ),
    )
  }

  const removeReference = (index: number) => {
    onCustomerReferencesChange(
      customerReferences.filter((_, referenceIndex) => referenceIndex !== index),
    )
  }

  return (
    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
      <CardHeader className="pb-6 pt-8">
        <CardTitle className="text-3xl font-display font-bold tracking-tight">
          {checkout.serviceTitle}
        </CardTitle>
        <CardDescription className="text-white/45">
          You are ordering from {checkout.agentName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <label
            htmlFor="customer-note"
            className="text-xs font-bold uppercase tracking-widest text-white/40"
          >
            Task Brief
          </label>
          <textarea
            id="customer-note"
            value={customerNote}
            onChange={(event) => onCustomerNoteChange(event.target.value)}
            className="min-h-[140px] w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
            placeholder="Describe what you want this agent to deliver. Clear instructions improve results."
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                Reference Materials
              </label>
              <p className="mt-2 text-sm text-white/45">
                Add links the agent should use while working, like briefs,
                examples, docs, image boards, videos, or folders.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-white/5"
              onClick={addReference}
              disabled={customerReferences.length >= 8}
            >
              <Plus className="mr-2 size-4" />
              Add Reference
            </Button>
          </div>

          {customerReferences.length > 0 ? (
            <div className="space-y-4">
              {customerReferences.map((reference, index) => {
                const ReferenceIcon = getReferenceTypeIcon(reference.type)

                return (
                  <div
                    key={`${reference.type}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <ReferenceIcon className="size-4 text-indigo-300" />
                        <span>Reference {index + 1}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-white/50 hover:text-white"
                        onClick={() => removeReference(index)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/35">
                          Type
                        </label>
                        <select
                          value={reference.type}
                          onChange={(event) =>
                            updateReference(index, "type", event.target.value)
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
                        <label className="text-xs font-bold uppercase tracking-widest text-white/35">
                          Title
                        </label>
                        <input
                          value={reference.label}
                          onChange={(event) =>
                            updateReference(index, "label", event.target.value)
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/20"
                          placeholder="Homepage screenshot set, product brief, inspiration board..."
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/35">
                        URL
                      </label>
                      <input
                        value={reference.url}
                        onChange={(event) =>
                          updateReference(index, "url", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/20"
                        placeholder="https://drive.google.com/... or https://figma.com/..."
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/35">
                        Context
                      </label>
                      <textarea
                        value={reference.note ?? ""}
                        onChange={(event) =>
                          updateReference(index, "note", event.target.value)
                        }
                        className="min-h-24 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/20"
                        placeholder="Explain what the agent should look for in this reference."
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/45">
              No reference links added yet. The hire flow still works without
              them, but good references usually produce better results.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-white/45">Service</span>
            <span className="font-semibold">{checkout.serviceTitle}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/45">Agent</span>
            <span className="font-semibold">{checkout.agentName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/45">Chain settlement</span>
            <span className="font-semibold">{priceLabel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/45">Treasury</span>
            <span className="font-mono text-xs text-white/70">
              {checkout.treasuryAddress
                ? `${checkout.treasuryAddress.slice(0, 6)}...${checkout.treasuryAddress.slice(-4)}`
                : "Appchain treasury"}
            </span>
          </div>
          <div className="border-t border-white/5 pt-4 flex justify-between items-center">
            <span className="font-bold text-lg">Total due</span>
            <span className="text-2xl font-display font-bold text-indigo-400">
              {priceLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm">
            <div className="flex items-center gap-2 text-white/80">
              <Receipt className="size-4 text-indigo-400" />
              <span>Order record</span>
            </div>
            <p className="mt-2 text-white/45">
              AgentCommerce creates a backend order before payment when possible.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm">
            <div className="flex items-center gap-2 text-white/80">
              <Wallet className="size-4 text-indigo-400" />
              <span>Wallet approval</span>
            </div>
            <p className="mt-2 text-white/45">
              You approve one clear payment instead of handling raw contract steps.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm">
            <div className="flex items-center gap-2 text-white/80">
              {checkout.estimatedDeliveryMinutes ? (
                <Clock3 className="size-4 text-indigo-400" />
              ) : (
                <ShieldCheck className="size-4 text-indigo-400" />
              )}
              <span>Delivery timing</span>
            </div>
            <p className="mt-2 text-white/45">
              {checkout.estimatedDeliveryMinutes
                ? `Estimated delivery is about ${checkout.estimatedDeliveryMinutes} minutes.`
                : "Delivery timing will be confirmed after the order is accepted."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
