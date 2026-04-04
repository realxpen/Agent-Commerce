"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useUsernameQuery } from "@initia/interwovenkit-react"
import {
  AtSign,
  ExternalLink,
  Loader2,
  Search,
  Wallet,
} from "lucide-react"
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
import { Input } from "@/components/ui/input"
import {
  formatInitiaUsername,
  INITIA_USERNAMES_CHAIN_ID,
  INITIA_USERNAMES_MODULE_ADDRESS,
  normalizeLookupUsername,
} from "@/lib/wallet/initia-usernames"

const INITIA_USERNAME_DOCS_URL =
  "https://docs.initia.xyz/developers/developer-guides/integrating-initia-apps/usernames"

type UsernameAddressLookupResult = {
  username: string
  hexAddress: string | null
  initiaAddress: string | null
  found: boolean
  source: string
}

type UsernameAddressLookupError = {
  error?: string
  details?: string
}

export function InitiaUsernameLookupCard() {
  const wallet = useWalletAccount()
  const [addressInput, setAddressInput] = useState(wallet.initiaAddress ?? "")
  const [submittedAddress, setSubmittedAddress] = useState(wallet.initiaAddress ?? "")
  const [usernameInput, setUsernameInput] = useState("")
  const [nameLookup, setNameLookup] = useState<UsernameAddressLookupResult | null>(null)
  const [nameLookupError, setNameLookupError] = useState<string | null>(null)
  const [isNameLookupPending, setIsNameLookupPending] = useState(false)
  const addressLookup = useUsernameQuery(submittedAddress || undefined)
  const resolvedLookupUsername = formatInitiaUsername(addressLookup.data)

  useEffect(() => {
    if (wallet.initiaAddress && !addressInput) {
      setAddressInput(wallet.initiaAddress)
      setSubmittedAddress(wallet.initiaAddress)
    }
  }, [addressInput, wallet.initiaAddress])

  async function handleUsernameLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedUsername = normalizeLookupUsername(usernameInput)
    if (!normalizedUsername) {
      setNameLookup(null)
      setNameLookupError("Enter a valid .init username to resolve.")
      return
    }

    setNameLookupError(null)
    setIsNameLookupPending(true)

    try {
      const response = await fetch(
        `/api/initia-usernames?username=${encodeURIComponent(normalizedUsername)}`,
        {
          cache: "no-store",
        },
      )
      const payload = (await response.json()) as
        | UsernameAddressLookupResult
        | UsernameAddressLookupError

      if (!response.ok) {
        const errorPayload = payload as UsernameAddressLookupError
        throw new Error(errorPayload.details ?? errorPayload.error ?? "Lookup failed.")
      }

      setNameLookup(payload as UsernameAddressLookupResult)
    } catch (error) {
      setNameLookup(null)
      setNameLookupError(
        error instanceof Error ? error.message : "Lookup failed.",
      )
    } finally {
      setIsNameLookupPending(false)
    }
  }

  function handleAddressLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedAddress(addressInput.trim())
  }

  function useConnectedWalletAddress() {
    if (!wallet.initiaAddress) {
      return
    }

    setAddressInput(wallet.initiaAddress)
    setSubmittedAddress(wallet.initiaAddress)
  }

  return (
    <Card className="glass-card border-white/5">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
            Initia usernames
          </Badge>
          <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
            {INITIA_USERNAMES_CHAIN_ID}
          </Badge>
        </div>
        <CardTitle className="text-lg">
          Resolve `.init` names and wallet addresses live
        </CardTitle>
        <CardDescription className="max-w-3xl text-white/45">
          This uses the official Initia usernames module on testnet so you can
          prove both lookup directions during the demo: wallet address to
          username, and username back to wallet address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
              Module
            </Badge>
            <span className="truncate font-mono text-xs text-white/55">
              {INITIA_USERNAMES_MODULE_ADDRESS}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-white/70">
                <Wallet className="size-4 text-indigo-300" />
                <p className="text-sm font-semibold">Connected wallet lookup</p>
              </div>
              <p className="mt-2 font-mono text-xs text-white/50">
                {wallet.initiaAddress ?? "Connect a wallet to test this instantly."}
              </p>
              <p className="mt-3 text-sm text-white/75">
                {wallet.initiaAddress
                  ? addressLookup.isLoading
                    ? "Checking the live usernames registry now."
                    : resolvedLookupUsername
                      ? resolvedLookupUsername
                      : "No on-chain `.init` username resolved for this wallet yet."
                  : "Once a wallet is connected, AgentCommerce can query its live `.init` name here."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-white/70">
                <Search className="size-4 text-indigo-300" />
                <p className="text-sm font-semibold">Docs reference</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                AgentCommerce follows the Initia usernames tutorial for
                `get_name_from_address` and `get_address_from_name`.
              </p>
              <Button asChild className="mt-3" size="sm" variant="glass">
                <a href={INITIA_USERNAME_DOCS_URL} rel="noreferrer" target="_blank">
                  Open username docs
                  <ExternalLink className="ml-2 size-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <form
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
            onSubmit={handleAddressLookup}
          >
            <div className="flex items-center gap-2 text-white/70">
              <Wallet className="size-4 text-indigo-300" />
              <p className="text-sm font-semibold">Address to username</p>
            </div>
            <p className="mt-2 text-sm text-white/45">
              Paste an Initia wallet address and resolve its live `.init` name.
            </p>
            <Input
              className="mt-4 border-white/10 bg-white/[0.03]"
              onChange={(event) => setAddressInput(event.target.value)}
              placeholder="init1... or 0x..."
              value={addressInput}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" type="submit" variant="glass">
                Resolve username
              </Button>
              {wallet.initiaAddress ? (
                <Button
                  onClick={useConnectedWalletAddress}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Use connected wallet
                </Button>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                Result
              </p>
              <div className="mt-2 text-sm text-white/75">
                {submittedAddress ? (
                  addressLookup.isLoading ? (
                    <span className="inline-flex items-center gap-2 text-indigo-200">
                      <Loader2 className="size-4 animate-spin" />
                      Resolving username...
                    </span>
                  ) : resolvedLookupUsername ? (
                    <span className="inline-flex items-center gap-2">
                      <AtSign className="size-4 text-emerald-300" />
                      <span className="font-medium text-emerald-200">
                        {resolvedLookupUsername}
                      </span>
                    </span>
                  ) : addressLookup.error ? (
                    <span className="text-rose-300">
                      {addressLookup.error.message}
                    </span>
                  ) : (
                    "No `.init` username was found for that address."
                  )
                ) : (
                  "Submit an address to check the registry."
                )}
              </div>
            </div>
          </form>

          <form
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
            onSubmit={handleUsernameLookup}
          >
            <div className="flex items-center gap-2 text-white/70">
              <AtSign className="size-4 text-indigo-300" />
              <p className="text-sm font-semibold">Username to wallet</p>
            </div>
            <p className="mt-2 text-sm text-white/45">
              Enter a `.init` name and resolve the wallet address behind it.
            </p>
            <Input
              className="mt-4 border-white/10 bg-white/[0.03]"
              onChange={(event) => setUsernameInput(event.target.value)}
              placeholder="creator.init"
              value={usernameInput}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={isNameLookupPending} size="sm" type="submit" variant="glass">
                {isNameLookupPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Resolving
                  </>
                ) : (
                  "Resolve wallet"
                )}
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                Result
              </p>
              {nameLookupError ? (
                <p className="mt-2 text-sm text-rose-300">{nameLookupError}</p>
              ) : nameLookup ? (
                <div className="mt-2 space-y-2 text-sm text-white/75">
                  <p className="font-medium text-emerald-200">{nameLookup.username}</p>
                  <p className="font-mono text-xs text-white/60">
                    {nameLookup.initiaAddress ?? "No Initia address found"}
                  </p>
                  {nameLookup.hexAddress ? (
                    <p className="font-mono text-xs text-white/40">
                      {nameLookup.hexAddress}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/55">
                  Submit a `.init` username to resolve its wallet address.
                </p>
              )}
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
