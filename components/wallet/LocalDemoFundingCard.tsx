"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Fuel,
  Loader2,
  Network,
  TerminalSquare,
  Wallet,
} from "lucide-react"
import { useBackendAuth } from "@/hooks/auth"
import { useWalletAccount } from "@/hooks/wallet"
import { useWalletConnectionFlow } from "@/hooks/wallet/useWalletConnectionFlow"
import { agentCommerceApi, getApiErrorMessage } from "@/lib/api"
import type {
  DemoFaucetRequestDto,
  DemoFaucetStatusDto,
} from "@/lib/api/types"
import { agentCommerceConfig } from "@/lib/appchain/config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const FALLBACK_FUNDING_AMOUNT = "10000000000000000000GAS"

export function LocalDemoFundingCard() {
  const wallet = useWalletAccount()
  const walletFlow = useWalletConnectionFlow()
  const auth = useBackendAuth()
  const [copiedValue, setCopiedValue] = useState<string | null>(null)
  const [faucetStatus, setFaucetStatus] = useState<DemoFaucetStatusDto | null>(null)
  const [lastFunding, setLastFunding] = useState<DemoFaucetRequestDto | null>(null)
  const [isLoadingFaucetStatus, setIsLoadingFaucetStatus] = useState(false)
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false)
  const [faucetError, setFaucetError] = useState<string | null>(null)

  const initiaAddress = wallet.initiaAddress ?? ""
  const fundingAmount = faucetStatus?.amount ?? FALLBACK_FUNDING_AMOUNT
  const fundingCommand = initiaAddress
    ? `minitiad tx bank send gas-station ${initiaAddress} ${fundingAmount} --from gas-station --keyring-backend test --chain-id ${agentCommerceConfig.appchain.interwovenChainId} --gas auto --gas-adjustment 1.4 --yes`
    : ""
  const balanceCommand = initiaAddress
    ? `minitiad query bank balances ${initiaAddress}`
    : ""

  const networkFields = useMemo(
    () => [
      {
        key: "display-name",
        label: "Network",
        value: agentCommerceConfig.appchain.displayName,
      },
      {
        key: "interwoven-chain-id",
        label: "Interwoven chain ID",
        value: agentCommerceConfig.appchain.interwovenChainId,
      },
      {
        key: "evm-chain-id",
        label: "EVM chain ID",
        value: String(agentCommerceConfig.appchain.chainId),
      },
      {
        key: "native-gas",
        label: "Native gas token",
        value: agentCommerceConfig.appchain.nativeCurrency.symbol,
      },
      {
        key: "json-rpc",
        label: "JSON-RPC",
        value: agentCommerceConfig.appchain.apiEndpoints.jsonRpc,
      },
      {
        key: "rpc",
        label: "Tendermint RPC",
        value: agentCommerceConfig.appchain.apiEndpoints.rpc,
      },
      {
        key: "rest",
        label: "REST",
        value: agentCommerceConfig.appchain.apiEndpoints.rest,
      },
      {
        key: "indexer",
        label: "Indexer",
        value: agentCommerceConfig.appchain.apiEndpoints.indexer,
      },
    ],
    [],
  )

  useEffect(() => {
    if (!agentCommerceConfig.status.apiReady) {
      return
    }

    let cancelled = false
    setIsLoadingFaucetStatus(true)

    void agentCommerceApi
      .getDemoFaucetStatus()
      .then((response) => {
        if (cancelled) {
          return
        }

        setFaucetStatus(response.data)
        setFaucetError(null)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setFaucetError(getApiErrorMessage(error))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingFaucetStatus(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function copyValue(value: string, key: string) {
    if (!value) {
      return
    }

    await navigator.clipboard.writeText(value)
    setCopiedValue(key)
    window.setTimeout(() => {
      setCopiedValue((current) => (current === key ? null : current))
    }, 1800)
  }

  async function requestDemoGas() {
    if (!faucetStatus?.available || !wallet.initiaAddress) {
      return
    }

    setFaucetError(null)
    setIsRequestingFaucet(true)

    try {
      if (faucetStatus.requiresAuth) {
        const session = await auth.ensureAuthenticated()
        if (!session) {
          throw new Error(
            auth.errorMessage ??
              "Unlock backend sync before requesting demo gas.",
          )
        }
      }

      const response = await agentCommerceApi.requestDemoFaucet({
        address: wallet.initiaAddress,
      })

      setLastFunding(response.data)
    } catch (error) {
      setFaucetError(getApiErrorMessage(error))
    } finally {
      setIsRequestingFaucet(false)
    }
  }

  const faucetActionLabel = !faucetStatus?.available
    ? "Demo faucet unavailable"
    : faucetStatus.requiresAuth && !auth.isAuthenticated
      ? "Unlock backend and request GAS"
      : "Request demo GAS"

  return (
    <Card className="glass-card border-white/5">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
            Network & funding
          </Badge>
          <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
            {agentCommerceConfig.appchain.interwovenChainId}
          </Badge>
        </div>
        <CardTitle className="text-lg">
          Make the AgentCommerce network and demo gas easy to access
        </CardTitle>
        <CardDescription className="text-white/45">
          Share the live network values below with public testers, let them
          switch into the right chain, and expose self-serve `GAS` when the
          backend faucet is enabled on your public deployment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white/70">
            <Network className="size-4 text-indigo-300" />
            <p className="text-sm font-semibold">Public network values</p>
          </div>
          <div className="mt-4 space-y-3">
            {networkFields.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#050505] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                    {field.label}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-white/75">
                    {field.value}
                  </p>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => void copyValue(field.value, field.key)}
                >
                  {copiedValue === field.key ? (
                    <>
                      <CheckCircle2 className="mr-2 size-4 text-emerald-300" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 size-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              variant="glass"
              onClick={() =>
                void (walletFlow.isConnected
                  ? walletFlow.switchNetwork()
                  : walletFlow.connect())
              }
            >
              {walletFlow.isConnected ? "Add / switch network" : "Connect wallet first"}
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() =>
                void walletFlow.openBridge({
                  srcChainId: agentCommerceConfig.bridge.defaultSourceChainId,
                  srcDenom: agentCommerceConfig.bridge.defaultSourceDenom,
                })
              }
            >
              Open bridge
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white/70">
            <Fuel className="size-4 text-indigo-300" />
            <p className="text-sm font-semibold">Public demo gas faucet</p>
          </div>

          {isLoadingFaucetStatus ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-white/55">
              <Loader2 className="size-4 animate-spin text-indigo-300" />
              Checking whether this deployment exposes a public demo faucet.
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {faucetStatus?.available
                  ? `Connected testers can request ${faucetStatus.amount} on ${faucetStatus.displayName}.`
                  : faucetStatus?.reason ??
                    "This deployment is not exposing a public demo faucet yet."}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant={faucetStatus?.available ? "success" : "outline"}
                  className="border-white/10 bg-white/[0.03]"
                >
                  {faucetStatus?.available ? "Faucet ready" : "Faucet off"}
                </Badge>
                {faucetStatus ? (
                  <Badge
                    variant="outline"
                    className="border-white/10 bg-white/[0.03]"
                  >
                    {faucetStatus.requiresAuth ? "Backend auth required" : "Open request"}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#050505] p-4">
                <div className="flex items-center gap-2 text-white/70">
                  <Wallet className="size-4 text-indigo-300" />
                  <p className="text-sm font-semibold">Connected Initia address</p>
                </div>
                <p className="mt-3 break-all font-mono text-xs text-white/65">
                  {initiaAddress || "Connect a wallet first to request demo gas."}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={
                    !faucetStatus?.available ||
                    !wallet.initiaAddress ||
                    isRequestingFaucet
                  }
                  onClick={() => void requestDemoGas()}
                  size="sm"
                  type="button"
                  variant="glass"
                >
                  {isRequestingFaucet ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Requesting
                    </>
                  ) : (
                    faucetActionLabel
                  )}
                </Button>
              </div>
            </>
          )}

          {lastFunding ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm text-emerald-100/85">
              <p className="font-semibold text-emerald-200">Demo gas submitted</p>
              <p className="mt-2">
                Sent {lastFunding.amount} to {lastFunding.requestedAddress}.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/60">
                    Chain
                  </p>
                  <p className="mt-1 break-all font-mono text-xs">
                    {lastFunding.chainId}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/60">
                    Tx hash
                  </p>
                  <p className="mt-1 break-all font-mono text-xs">
                    {lastFunding.txHash ?? "Submitted"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {faucetError ? (
            <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 text-sm leading-relaxed text-amber-100/75">
              {faucetError}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white/70">
            <TerminalSquare className="size-4 text-indigo-300" />
            <p className="text-sm font-semibold">Fallback local funding command</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Keep this for self-hosted local rollups or private staging
            environments where testers cannot use the public faucet yet.
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-[#050505] p-3 text-xs text-white/75">
            <code>{fundingCommand || "Connect a wallet to generate the command."}</code>
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={!fundingCommand}
              onClick={() => void copyValue(fundingCommand, "fund")}
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
              onClick={() => void copyValue(balanceCommand, "balance")}
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
          Public testers only need the network values above plus a faucet-backed
          `GAS` balance. Local shells and `minitiad` are only for self-hosted
          environments. If you expose a bridge and public rollup endpoints, the
          app can handle wallet connect and network switching from the UI.
          <div className="mt-3">
            <a
              className="inline-flex items-center gap-2 text-amber-100 hover:text-white"
              href="/dashboard/bridge"
            >
              Open the bridge page
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
