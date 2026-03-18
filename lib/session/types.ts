export type SessionSurface =
  | "dashboard"
  | "checkout"
  | "agent_profile"
  | "create_agent"
  | "settings"
  | "sidebar"
  | "general"

export type SessionApprovalStatus =
  | "inactive"
  | "requesting"
  | "active"
  | "expiring"
  | "expired"
  | "revoking"

export type SessionApprovalBackendSyncStatus =
  | "idle"
  | "pending"
  | "synced"
  | "error"

export type SessionApprovalRecord = {
  sessionId: string | null
  status: SessionApprovalStatus
  walletAddress: string | null
  chainId: string | null
  grantee: string | null
  approvedAt: string | null
  expiresAt: string | null
  lastUsedAt: string | null
  lastUsedSurface: SessionSurface | null
  scopeLabel: string
  limitLabel: string
  providerKind: "interwovenkit_native" | "interwovenkit_placeholder"
  storageMode: "backend_synced" | "frontend_local_preview"
  backendSyncStatus: SessionApprovalBackendSyncStatus
}

export type SessionApprovalRequestInput = {
  surface?: SessionSurface
  durationHours?: number
  scopeLabel?: string
  limitLabel?: string
}
