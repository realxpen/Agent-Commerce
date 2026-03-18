"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export function HeaderBackLink({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white",
        className,
      )}
    >
      <ChevronLeft className="h-5 w-5" />
      <span className="font-medium">{label}</span>
    </Link>
  )
}
