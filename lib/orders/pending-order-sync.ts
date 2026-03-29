"use client"

import type {
  CreateOrderRecordInput,
  CreatePaymentRecordInput,
} from "@/lib/api/types"

const STORAGE_KEY = "agentcommerce:pending-order-syncs"

export type PendingOrderSyncRecord = {
  id: string
  paymentReference: string
  backendOrderId: string | null
  orderInput: CreateOrderRecordInput
  paymentInput: Omit<CreatePaymentRecordInput, "orderId">
  txHash: string
  onchainOrderId: string | null
  createdAt: string
  updatedAt: string
}

function normalizeRecord(
  value: PendingOrderSyncRecord,
): PendingOrderSyncRecord {
  return {
    ...value,
    id: value.id.trim(),
    paymentReference: value.paymentReference.trim(),
    backendOrderId: value.backendOrderId?.trim() || null,
    txHash: value.txHash.trim(),
    onchainOrderId: value.onchainOrderId?.trim() || null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

export function readPendingOrderSyncs() {
  if (typeof window === "undefined") {
    return [] as PendingOrderSyncRecord[]
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return [] as PendingOrderSyncRecord[]
    }

    const parsed = JSON.parse(raw) as PendingOrderSyncRecord[]
    if (!Array.isArray(parsed)) {
      return [] as PendingOrderSyncRecord[]
    }

    return parsed
      .filter((entry): entry is PendingOrderSyncRecord => {
        return Boolean(
          entry &&
            typeof entry === "object" &&
            typeof entry.id === "string" &&
            typeof entry.paymentReference === "string" &&
            typeof entry.txHash === "string" &&
            entry.orderInput &&
            typeof entry.orderInput === "object" &&
            entry.paymentInput &&
            typeof entry.paymentInput === "object",
        )
      })
      .map(normalizeRecord)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  } catch {
    return [] as PendingOrderSyncRecord[]
  }
}

function writePendingOrderSyncs(records: PendingOrderSyncRecord[]) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Best-effort persistence for backend recovery after on-chain success.
  }
}

export function upsertPendingOrderSync(record: PendingOrderSyncRecord) {
  const normalized = normalizeRecord(record)
  const existing = readPendingOrderSyncs().filter(
    (entry) => entry.id !== normalized.id,
  )
  writePendingOrderSyncs([normalized, ...existing])
}

export function removePendingOrderSync(id: string) {
  const normalizedId = id.trim()
  const next = readPendingOrderSyncs().filter(
    (entry) => entry.id !== normalizedId,
  )
  writePendingOrderSyncs(next)
}

export function getPendingOrderSync(id: string) {
  const normalizedId = id.trim()
  return (
    readPendingOrderSyncs().find((entry) => entry.id === normalizedId) ?? null
  )
}
