import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  SendHorizontal,
  Wallet,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TransactionStateBadge } from "@/components/transactions/TransactionStateBadge"
import type { TransactionState } from "@/lib/transactions/types"
import { cn } from "@/lib/utils"

function TransactionStatusIcon({
  transaction,
  isAutoSigning,
}: {
  transaction: TransactionState
  isAutoSigning?: boolean
}) {
  if (transaction.isConfirmed) {
    return <CheckCircle2 className="h-10 w-10 text-emerald-400" />
  }

  if (transaction.isFailed) {
    return <AlertCircle className="h-10 w-10 text-rose-400" />
  }

  if (transaction.isAwaitingWallet) {
    return isAutoSigning ? (
      <Zap className="h-10 w-10 animate-pulse text-indigo-400" />
    ) : (
      <Wallet className="h-10 w-10 text-indigo-400" />
    )
  }

  if (transaction.isSubmitting) {
    return <SendHorizontal className="h-10 w-10 text-indigo-400" />
  }

  return <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
}

export function TransactionStatusPanel({
  transaction,
  warningMessage,
  helperMessage,
  onRetry,
  retryLabel,
  isAutoSigning,
  className,
}: {
  transaction: TransactionState
  warningMessage?: string | null
  helperMessage?: string | null
  onRetry?: (() => void) | null
  retryLabel?: string
  isAutoSigning?: boolean
  className?: string
}) {
  return (
    <Card className={cn("glass-card border-white/5 shadow-2xl", className)}>
      <CardContent className="flex flex-col items-center justify-center space-y-6 py-14 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex justify-center">
            <TransactionStateBadge status={transaction.status} />
          </div>

          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-white/5" />
            {!transaction.isConfirmed && !transaction.isFailed ? (
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            ) : null}
            <TransactionStatusIcon
              transaction={transaction}
              isAutoSigning={isAutoSigning}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold">
            {transaction.title}
          </h2>
          <p className="mx-auto max-w-md text-white/45">
            {transaction.description}
          </p>
        </div>

        {transaction.txHash ? (
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
              Transaction Hash
            </p>
            <p className="mt-2 break-all font-mono text-xs text-white/65">
              {transaction.txHash}
            </p>
          </div>
        ) : null}

        {transaction.errorMessage ? (
          <div className="w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-100">
            {transaction.error?.title ? (
              <p className="mb-1 font-semibold">{transaction.error.title}</p>
            ) : null}
            {transaction.errorMessage}
          </div>
        ) : null}

        {warningMessage ? (
          <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-100">
            {warningMessage}
          </div>
        ) : null}

        {helperMessage ? (
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/65">
            {helperMessage}
          </div>
        ) : null}

        {transaction.canRetry && onRetry ? (
          <Button
            variant="outline"
            onClick={onRetry}
            className="border-white/10 bg-white/5"
          >
            {retryLabel ?? transaction.retryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
