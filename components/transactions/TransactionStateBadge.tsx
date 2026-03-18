import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TransactionLifecycleStatus } from "@/lib/transactions/types"

const statusLabelMap: Record<TransactionLifecycleStatus, string> = {
  idle: "Idle",
  preparing: "Preparing",
  awaiting_wallet: "Awaiting Wallet",
  submitting: "Submitting",
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
}

const statusVariantMap: Record<
  TransactionLifecycleStatus,
  "outline" | "secondary" | "warning" | "success" | "destructive"
> = {
  idle: "outline",
  preparing: "secondary",
  awaiting_wallet: "secondary",
  submitting: "secondary",
  pending: "warning",
  confirmed: "success",
  failed: "destructive",
}

export function TransactionStateBadge({
  status,
  label,
  className,
}: {
  status: TransactionLifecycleStatus
  label?: string
  className?: string
}) {
  return (
    <Badge
      variant={statusVariantMap[status]}
      className={cn("border-white/10 bg-white/[0.03]", className)}
    >
      {label ?? statusLabelMap[status]}
    </Badge>
  )
}
