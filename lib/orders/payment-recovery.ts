import type {
  CreatePaymentRecordInput,
  JsonValue,
  OrderDto,
} from "@/lib/api/types"

type JsonRecord = Record<string, JsonValue>

export type ExpectedPaymentInfo = {
  chainId: string
  amount: string
  currency: string | null
  denom: string
  payerAddress: string | null
  recipientAddress: string | null
  paymentReference: string | null
  txHash: string | null
}

function isJsonRecord(value: JsonValue | null | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function readExpectedPaymentInfo(
  value: JsonValue | null | undefined,
): ExpectedPaymentInfo | null {
  if (!isJsonRecord(value)) {
    return null
  }

  const chainId =
    typeof value.chainId === "string" && value.chainId.trim().length > 0
      ? value.chainId.trim()
      : null
  const amount =
    typeof value.amount === "string" && value.amount.trim().length > 0
      ? value.amount.trim()
      : null
  const currency =
    typeof value.currency === "string" && value.currency.trim().length > 0
      ? value.currency.trim()
      : null
  const denom =
    typeof value.denom === "string" && value.denom.trim().length > 0
      ? value.denom.trim()
      : null
  const payerAddress =
    typeof value.payerAddress === "string" && value.payerAddress.trim().length > 0
      ? value.payerAddress.trim()
      : null
  const recipientAddress =
    typeof value.recipientAddress === "string" &&
    value.recipientAddress.trim().length > 0
      ? value.recipientAddress.trim()
      : null
  const paymentReference =
    typeof value.paymentReference === "string" &&
    value.paymentReference.trim().length > 0
      ? value.paymentReference.trim()
      : null
  const txHash =
    typeof value.txHash === "string" && value.txHash.trim().length > 0
      ? value.txHash.trim()
      : null

  if (!chainId || !amount || !denom || !recipientAddress) {
    return null
  }

  return {
    chainId,
    amount,
    currency,
    denom,
    payerAddress,
    recipientAddress,
    paymentReference,
    txHash,
  }
}

export function buildPaymentRecoveryInput(options: {
  order: OrderDto
  fallbackTxHash?: string | null
}): CreatePaymentRecordInput | null {
  if (options.order.paymentStatus === "PAID") {
    return null
  }

  const expectedPayment = readExpectedPaymentInfo(options.order.payment.expectedInfo)
  const recoveredTxHash =
    options.order.payment.txHash ?? options.fallbackTxHash ?? expectedPayment?.txHash
  const senderAddress = expectedPayment?.payerAddress
  const recipientAddress = expectedPayment?.recipientAddress

  if (
    !expectedPayment ||
    !recoveredTxHash ||
    !senderAddress ||
    !recipientAddress
  ) {
    return null
  }

  return {
    orderId: options.order.id,
    chainId: expectedPayment.chainId,
    paymentReference:
      options.order.payment.reference ?? expectedPayment.paymentReference ?? undefined,
    txHash: recoveredTxHash,
    amount:
      options.order.pricing.finalPaidAmount ??
      options.order.pricing.quotedPrice,
    currency: expectedPayment.currency ?? undefined,
    denom: expectedPayment.denom,
    sender: senderAddress,
    recipient: recipientAddress,
    status: "CONFIRMED",
  }
}
