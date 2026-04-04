import { agentCommerceConfig } from "@/lib/appchain/config"
import type { AgentDto, AgentServiceDto, JsonValue } from "@/lib/api/types"

export type CheckoutContext = {
  backendServiceId: string
  backendAgentId: string
  agentName: string
  agentSlug: string
  serviceTitle: string
  serviceDescription: string | null
  currency: string | null
  denom: string
  displayAmount: string
  estimatedDeliveryMinutes: number | null
  treasuryAddress: string
  onchainAgentId: bigint | null
  onchainServiceId: bigint | null
  payableAmount: bigint | null
}

type SearchParamReader = {
  get(name: string): string | null
}

function isRecord(value: JsonValue | null | undefined): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readCandidate(record: Record<string, JsonValue>, key: string) {
  const value = record[key]
  return typeof value === "string" || typeof value === "number" ? String(value) : null
}

function parseBigIntCandidate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    return BigInt(value)
  } catch {
    return null
  }
}

function parseDecimalToBaseUnits(value: string, decimals: number) {
  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null
  }

  const [whole, fraction = ""] = normalized.split(".")
  const paddedFraction = `${fraction}${"0".repeat(decimals)}`.slice(0, decimals)

  return BigInt(`${whole}${paddedFraction}`)
}

export function formatBaseUnitsToDecimal(
  value: bigint | string | null | undefined,
  decimals: number,
) {
  if (value === null || value === undefined) {
    return null
  }

  let numericValue: bigint

  try {
    numericValue = typeof value === "bigint" ? value : BigInt(value)
  } catch {
    return null
  }

  const sign = numericValue < 0n ? "-" : ""
  const absoluteValue = numericValue < 0n ? -numericValue : numericValue
  const padded = absoluteValue.toString().padStart(decimals + 1, "0")
  const whole = padded.slice(0, Math.max(1, padded.length - decimals))
  const fraction = padded.slice(Math.max(1, padded.length - decimals)).replace(/0+$/, "")

  return `${sign}${whole}${fraction ? `.${fraction}` : ""}`
}

export function getCheckoutOnchainReferences(metadata: JsonValue | null) {
  if (!isRecord(metadata)) {
    return {
      onchainAgentId: null,
      onchainServiceId: null,
      payableAmount: null,
    }
  }

  const onchain = isRecord(metadata.onchain) ? metadata.onchain : null
  const payment = isRecord(metadata.payment) ? metadata.payment : null
  const contract = isRecord(metadata.contract) ? metadata.contract : null

  return {
    onchainAgentId:
      parseBigIntCandidate(readCandidate(onchain ?? {}, "agentId")) ??
      parseBigIntCandidate(readCandidate(contract ?? {}, "agentId")),
    onchainServiceId:
      parseBigIntCandidate(readCandidate(onchain ?? {}, "serviceId")) ??
      parseBigIntCandidate(readCandidate(contract ?? {}, "serviceId")),
    payableAmount:
      parseBigIntCandidate(readCandidate(payment ?? {}, "payableAmount")) ??
      parseBigIntCandidate(readCandidate(onchain ?? {}, "payableAmount")) ??
      parseBigIntCandidate(readCandidate(contract ?? {}, "price")) ??
      null,
  }
}

type CheckoutHrefAgent = Pick<
  AgentDto,
  "id" | "name" | "slug" | "treasuryAddress"
>

export function buildCheckoutHref(options: {
  agent: CheckoutHrefAgent
  service: AgentServiceDto
}) {
  const { agent, service } = options
  const { onchainAgentId, onchainServiceId, payableAmount } =
    getCheckoutOnchainReferences(service.metadata)
  const searchParams = new URLSearchParams({
    agentId: agent.id,
    agentName: agent.name,
    agentSlug: agent.slug,
    serviceTitle: service.title,
    serviceDescription: service.description ?? "",
    amount: service.pricing.amount,
    currency: service.pricing.currency ?? "",
    denom: service.pricing.denom,
    estimatedDeliveryMinutes:
      service.estimatedDeliveryMinutes !== null
        ? String(service.estimatedDeliveryMinutes)
        : "",
    treasuryAddress: agent.treasuryAddress,
  })

  if (onchainAgentId !== null) {
    searchParams.set("onchainAgentId", onchainAgentId.toString())
  }

  if (onchainServiceId !== null) {
    searchParams.set("onchainServiceId", onchainServiceId.toString())
  }

  if (payableAmount !== null) {
    searchParams.set("payableAmount", payableAmount.toString())
  }

  return `/checkout/${service.id}?${searchParams.toString()}`
}

export function parseCheckoutContext(options: {
  serviceId: string
  searchParams: SearchParamReader
}) {
  const { searchParams, serviceId } = options
  const amount = searchParams.get("amount") ?? "0"
  const explicitPayableAmount = searchParams.get("payableAmount")
  const payableAmount =
    parseBigIntCandidate(explicitPayableAmount) ??
    parseDecimalToBaseUnits(
      amount,
      agentCommerceConfig.appchain.nativeCurrency.decimals,
    )

  return {
    backendServiceId: serviceId,
    backendAgentId: searchParams.get("agentId") ?? "",
    agentName: searchParams.get("agentName") ?? "Agent",
    agentSlug: searchParams.get("agentSlug") ?? "",
    serviceTitle: searchParams.get("serviceTitle") ?? "Service",
    serviceDescription: searchParams.get("serviceDescription") || null,
    currency: searchParams.get("currency") || null,
    denom:
      searchParams.get("denom") ??
      agentCommerceConfig.appchain.nativeCurrency.symbol,
    displayAmount: amount,
    estimatedDeliveryMinutes: searchParams.get("estimatedDeliveryMinutes")
      ? Number(searchParams.get("estimatedDeliveryMinutes"))
      : null,
    treasuryAddress: searchParams.get("treasuryAddress") ?? "",
    onchainAgentId: parseBigIntCandidate(searchParams.get("onchainAgentId")),
    onchainServiceId: parseBigIntCandidate(searchParams.get("onchainServiceId")),
    payableAmount,
  } satisfies CheckoutContext
}

function isMeaningfulText(value: string | null | undefined, fallback?: string) {
  if (!value) {
    return false
  }

  if (fallback && value === fallback) {
    return false
  }

  return value.trim().length > 0
}

export function hydrateCheckoutContextFromService(options: {
  checkout: CheckoutContext
  service: AgentServiceDto | null | undefined
}) {
  const { checkout, service } = options

  if (!service) {
    return checkout
  }

  const { onchainAgentId, onchainServiceId, payableAmount } =
    getCheckoutOnchainReferences(service.metadata)

  return {
    ...checkout,
    backendAgentId:
      checkout.backendAgentId || service.agentId || service.agent?.id || "",
    agentName: isMeaningfulText(checkout.agentName, "Agent")
      ? checkout.agentName
      : service.agent?.name ?? checkout.agentName,
    agentSlug: checkout.agentSlug || service.agent?.slug || "",
    serviceTitle: isMeaningfulText(checkout.serviceTitle, "Service")
      ? checkout.serviceTitle
      : service.title,
    serviceDescription: checkout.serviceDescription ?? service.description,
    currency: checkout.currency ?? service.pricing.currency ?? null,
    denom:
      isMeaningfulText(checkout.denom)
        ? checkout.denom
        : service.pricing.denom,
    displayAmount: isMeaningfulText(checkout.displayAmount, "0")
      ? checkout.displayAmount
      : service.pricing.amount,
    estimatedDeliveryMinutes:
      checkout.estimatedDeliveryMinutes ?? service.estimatedDeliveryMinutes,
    treasuryAddress:
      checkout.treasuryAddress || service.agent?.treasuryAddress || "",
    onchainAgentId: checkout.onchainAgentId ?? onchainAgentId,
    onchainServiceId: checkout.onchainServiceId ?? onchainServiceId,
    payableAmount:
      checkout.payableAmount ??
      payableAmount ??
      parseDecimalToBaseUnits(
        service.pricing.amount,
        agentCommerceConfig.appchain.nativeCurrency.decimals,
      ),
  } satisfies CheckoutContext
}

export function buildOrderDetailsHref(options: {
  orderId: string
  txHash: string
  checkout: CheckoutContext
  pending?: boolean
  onchainOrderId?: bigint | null
  role?: "customer" | "agent_owner"
}) {
  const searchParams = new URLSearchParams({
    txHash: options.txHash,
    agentName: options.checkout.agentName,
    serviceTitle: options.checkout.serviceTitle,
    amount: options.checkout.displayAmount,
    denom: options.checkout.currency ?? options.checkout.denom,
    pending: options.pending ? "1" : "0",
    role: options.role ?? "customer",
  })

  if (options.onchainOrderId !== undefined && options.onchainOrderId !== null) {
    searchParams.set("onchainOrderId", options.onchainOrderId.toString())
  }

  return `/orders/${options.orderId}?${searchParams.toString()}`
}
