"use client"

import { useState } from "react"
import { CheckCircle2, Copy, TerminalSquare, Wallet } from "lucide-react"
import { useWalletAccount } from "@/hooks/wallet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const LOCAL_CHAIN_ID = "agentcommerce-1"
const LOCAL_FUNDING_AMOUNT = "10000000000000000000GAS"

export function LocalDemoFundingCard() {
  const wallet = useWalletAccount()
  const [copiedValue, setCopiedValue] = useState<"fund" | "balance" | null>(null)

  const initiaAddress = wallet.initiaAddress ?? ""
  const fundingCommand = initiaAddress
    ? `minitiad tx bank send gas-station ${initiaAddress} ${LOCAL_FUNDING_AMOUNT} --from gas-station --keyring-backend test --chain-id ${LOCAL_CHAIN_ID} --gas auto --gas-adjustment 1.4 --yes`
    : ""
  const balanceCommand = initiaAddress
    ? `minitiad query bank balances ${initiaAddress}`
    : ""

  async function copyCommand(
    value: string,
    type: "fund" | "balance",
  ) {
    if (!value) {
      return
    }

    await navigator.clipboard.writeText(value)
    setCopiedValue(type)
    window.setTimeout(() => {
      setCopiedValue((current) => (current === type ? null : current))
    }, 1800)
  }

  return (
    <Card className="glass-card border-white/5">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
            Local demo funding
          </Badge>
          <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
            {LOCAL_CHAIN_ID}
          </Badge>
        </div>
        <CardTitle className="text-lg">
          Fund the connected wallet with local demo gas
        </CardTitle>
        <CardDescription className="text-white/45">
          This generates the exact command judges can run on the machine hosting
          the local rollup. It uses the local `gas-station` account and the
          connected wallet&apos;s `init1...` address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white/70">
            <Wallet className="size-4 text-indigo-300" />
            <p className="text-sm font-semibold">Connected Initia address</p>
          </div>
          <p className="mt-3 break-all font-mono text-xs text-white/65">
            {initiaAddress || "Connect a wallet first to generate a funding command."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white/70">
            <TerminalSquare className="size-4 text-indigo-300" />
            <p className="text-sm font-semibold">Funding command</p>
          </div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-[#050505] p-3 text-xs text-white/75">
            <code>{fundingCommand || "Connect a wallet to generate the command."}</code>
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={!fundingCommand}
              onClick={() => void copyCommand(fundingCommand, "fund")}
              size="sm"
              type="button"
              variant="glass"
            >
              {copiedValue === "fund" ? (
                <>
                  <CheckCircle2 className="mr-2 size-4 text-emerald-300" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 size-4" />
                  Copy funding command
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">Balance check</p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-[#050505] p-3 text-xs text-white/75">
            <code>{balanceCommand || "Connect a wallet to generate the command."}</code>
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={!balanceCommand}
              onClick={() => void copyCommand(balanceCommand, "balance")}
              size="sm"
              type="button"
              variant="outline"
            >
              {copiedValue === "balance" ? (
                <>
                  <CheckCircle2 className="mr-2 size-4 text-emerald-300" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 size-4" />
                  Copy balance check
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 text-sm leading-relaxed text-amber-100/75">
          Run this command in the same terminal environment where your local
          rollup is running and `minitiad status` works, usually your WSL or
          local dev shell. Do not include angle brackets when running the
          command. The copied version is already ready to paste.
        </div>
      </CardContent>
    </Card>
  )
}
