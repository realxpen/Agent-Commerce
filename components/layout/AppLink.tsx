"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type TouchEvent,
} from "react"

type AppLinkProps = ComponentPropsWithoutRef<typeof Link>

function getPrefetchHref(href: AppLinkProps["href"]) {
  return typeof href === "string" && href.startsWith("/") ? href : null
}

export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(
  function AppLink(
    { href, onMouseEnter, onFocus, onTouchStart, prefetch, ...props },
    ref,
  ) {
    const router = useRouter()

    const warmRoute = () => {
      const nextHref = getPrefetchHref(href)

      if (!nextHref) {
        return
      }

      try {
        void router.prefetch(nextHref)
      } catch {
        // Prefetch is best-effort and should never block navigation.
      }
    }

    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch ?? true}
        onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
          warmRoute()
          onMouseEnter?.(event)
        }}
        onFocus={(event) => {
          warmRoute()
          onFocus?.(event)
        }}
        onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
          warmRoute()
          onTouchStart?.(event)
        }}
        {...props}
      />
    )
  },
)
