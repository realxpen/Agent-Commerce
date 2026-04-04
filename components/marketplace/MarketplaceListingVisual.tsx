"use client"

import { Image as ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function MarketplaceListingVisual({
  imageUrl,
  imageAlt,
  eyebrow,
  title,
  description,
  badges = [],
  className,
  compact = false,
}: {
  imageUrl?: string | null
  imageAlt: string
  eyebrow?: string | null
  title: string
  description?: string | null
  badges?: readonly string[]
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/10 bg-black/40",
        className,
      )}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/20" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.18),transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02),rgba(0,0,0,0.06))]" />
          <div className="absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.05] text-white/45">
            <ImageIcon className="h-6 w-6" />
          </div>
        </>
      )}

      <div className="relative z-10 flex h-full flex-col justify-end gap-3 p-5 sm:p-6">
        {eyebrow ? (
          <Badge className="w-fit border-white/15 bg-black/35 text-[10px] uppercase tracking-[0.18em] text-white">
            {eyebrow}
          </Badge>
        ) : null}

        <div className="max-w-2xl">
          <h3
            className={cn(
              "font-display font-bold tracking-tight text-white",
              compact ? "text-xl leading-tight" : "text-3xl leading-tight sm:text-4xl",
            )}
          >
            {title}
          </h3>
          {description ? (
            <p
              className={cn(
                "mt-3 text-white/78",
                compact ? "text-sm leading-6" : "text-sm leading-7 sm:text-base",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>

        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.slice(0, compact ? 2 : 4).map((badge) => (
              <Badge
                key={badge}
                variant="outline"
                className="border-white/15 bg-black/25 text-[10px] uppercase tracking-[0.16em] text-white/82"
              >
                {badge}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
