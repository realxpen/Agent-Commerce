import type {
  SessionApprovalRecord,
  SessionApprovalStatus,
  SessionSurface,
} from "@/lib/session/types"

export const SESSION_EXPIRING_WINDOW_MS = 30 * 60 * 1000

export function createInactiveSessionRecord(
  walletAddress: string | null = null,
): SessionApprovalRecord {
  return {
    sessionId: null,
    status: "inactive",
    walletAddress,
    chainId: null,
    grantee: null,
    approvedAt: null,
    expiresAt: null,
    lastUsedAt: null,
    lastUsedSurface: null,
    scopeLabel: "Repeat checkout and agent actions",
    limitLabel: "Up to 10 INIT per action",
    providerKind: "interwovenkit_native",
    storageMode: "backend_synced",
    backendSyncStatus: "idle",
  }
}

export function getSessionDerivedStatus(
  record: SessionApprovalRecord,
  now = Date.now(),
): SessionApprovalStatus {
  if (!record.expiresAt) {
    if (record.status === "requesting" || record.status === "revoking") {
      return record.status
    }

    if (record.status === "active" || record.status === "expiring") {
      return "active"
    }

    return "inactive"
  }

  if (record.status === "requesting" || record.status === "revoking") {
    return record.status
  }

  const expiresAtMs = Date.parse(record.expiresAt)

  if (Number.isNaN(expiresAtMs) || expiresAtMs <= now) {
    return "expired"
  }

  if (expiresAtMs - now <= SESSION_EXPIRING_WINDOW_MS) {
    return "expiring"
  }

  return "active"
}

export function getSessionRemainingMs(
  record: SessionApprovalRecord,
  now = Date.now(),
) {
  if (!record.expiresAt) {
    if (record.status === "active" || record.status === "expiring") {
      return Number.POSITIVE_INFINITY
    }

    return 0
  }

  const expiresAtMs = Date.parse(record.expiresAt)

  if (Number.isNaN(expiresAtMs)) {
    return 0
  }

  return Math.max(0, expiresAtMs - now)
}

export function formatSessionCountdown(remainingMs: number) {
  if (!Number.isFinite(remainingMs)) {
    return "Until revoked"
  }

  if (remainingMs <= 0) {
    return "00:00:00"
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":")
}

export function formatSessionRemainingLabel(remainingMs: number) {
  if (!Number.isFinite(remainingMs)) {
    return "Until revoked"
  }

  if (remainingMs <= 0) {
    return "Expired"
  }

  const totalMinutes = Math.floor(remainingMs / (60 * 1000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) {
    return `${Math.max(1, minutes)}m left`
  }

  if (minutes <= 0) {
    return `${hours}h left`
  }

  return `${hours}h ${minutes}m left`
}

export function getSessionSurfaceCopy(surface: SessionSurface) {
  switch (surface) {
    case "checkout":
      return {
        scopeLabel: "Repeat checkout and order follow-ups",
        limitLabel: "Up to 10 INIT per action",
      }
    case "agent_profile":
      return {
        scopeLabel: "Hiring and repeat agent interactions",
        limitLabel: "Up to 10 INIT per action",
      }
    case "create_agent":
      return {
        scopeLabel: "Agent launches and service setup",
        limitLabel: "Up to 10 INIT per action",
      }
    case "dashboard":
    case "settings":
    case "sidebar":
    case "general":
    default:
      return {
        scopeLabel: "Repeat checkout and agent actions",
        limitLabel: "Up to 10 INIT per action",
      }
  }
}

export function formatSessionLastUsedLabel(timestamp: string | null) {
  if (!timestamp) {
    return "Not used yet"
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return "Not used yet"
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
