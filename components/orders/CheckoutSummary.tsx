"use client"

import { Clock3, Receipt, ShieldCheck, Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CheckoutContext } from "@/lib/orders/checkout"

export function CheckoutSummary({
  checkout,
  customerNote,
  onCustomerNoteChange,
}: {
  checkout: CheckoutContext
  customerNote: string
  onCustomerNoteChange: (value: string) => void
}) {
  const priceLabel = checkout.currency
    ? `${checkout.displayAmount} ${checkout.currency}`
    : `${checkout.displayAmount} ${checkout.denom}`

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
