"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function OrderSuccessConfirmation({
  orderDetailsHref,
  txHash,
  title,
  subtitle,
}: {
  orderDetailsHref: string
  txHash: string
  title: string
  subtitle: string
}) {
  const router = useRouter()

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.push(orderDetailsHref)
    }, 1800)

    return () => window.clearTimeout(timeout)
  }, [orderDetailsHref, router])

  return (
    <Card className="glass-card border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
      <CardContent className="flex flex-col items-center justify-center space-y-8 px-10 py-20 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-display font-bold">{title}</h2>
          <p className="mx-auto max-w-md text-white/45">{subtitle}</p>
        </div>

        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
            Transaction Hash
          </p>
          <p className="mt-2 break-all font-mono text-xs text-white/65">
            {txHash}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link href={orderDetailsHref} className="block">
            <Button className="w-full">View Order Details</Button>
          </Link>
          <Link href="/marketplace" className="block">
            <Button variant="ghost" className="w-full">
              Continue Browsing
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
