"use client"

import { cn } from "@/lib/utils"

export function SkeletonBlock({
  className,
}: {
  className?: string
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]",
        className,
      )}
    />
  )
}
