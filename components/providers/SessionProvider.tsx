"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useInterwovenKit } from "@initia/interwovenkit-react"
import { useBackendAuth } from "@/hooks/auth"
import { useWalletAccount } from "@/hooks/wallet/useWalletAccount"
import { agentCommerceApi } from "@/lib/api"
import { agentCommerceConfig } from "@/lib/appchain/config"
import {
  createInactiveSessionRecord,
  formatSessionCountdown,
  formatSessionRemainingLabel,
  getSessionDerivedStatus,
  getSessionRemainingMs,
  getSessionSurfaceCopy,
} from "@/lib/session/format"
import type {
  SessionApprovalBackendSyncStatus,
  SessionApprovalRecord,
  SessionApprovalRequestInput,
  SessionSurface,
} from "@/lib/session/types"
import type { AutoSignSessionApprovalDto } from "@/lib/api/types"

type SessionContextType = {
  session: SessionApprovalRecord
  isSessionActive: boolean
  sessionExpiry: string
  sessionRemainingLabel: string
  requestSessionApproval: (
    input?: SessionApprovalRequestInput,
  ) => Promise<SessionApprovalRecord | null>
  extendSessionApproval: (
    input?: SessionApprovalRequestInput,
  ) => Promise<SessionApprovalRecord | null>
  revokeSessionApproval: () => Promise<void>
  markSessionUsed: (surface: SessionApprovalRequestInput["surface"]) => void
  activateSession: () => Promise<SessionApprovalRecord | null>
  revokeSession: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

const SESSION_SURFACES: SessionSurface[] = [
  "dashboard",
  "checkout",
  "agent_profile",
  "create_agent",
  "settings",
  "sidebar",
  "general",
]

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function parseScopeValue(
  record: AutoSignSessionApprovalDto | null,
  field: "scopeLabel" | "limitLabel",
  fallback: string,
) {
  if (
    record?.scope &&
    typeof record.scope === "object" &&
    !Array.isArray(record.scope) &&
    field in record.scope
  ) {
    const value = record.scope[field]
    return typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : fallback
  }

  return fallback
}

function isSessionSurface(value: string): value is SessionSurface {
  return SESSION_SURFACES.includes(value as SessionSurface)
}

function parseLastUsedSurface(record: AutoSignSessionApprovalDto | null) {
  if (
    record?.metadata &&
    typeof record.metadata === "object" &&
    !Array.isArray(record.metadata) &&
    "lastUsedSurface" in record.metadata
  ) {
    const value = record.metadata.lastUsedSurface
    return typeof value === "string" && isSessionSurface(value) ? value : null
  }

  return null
}

function buildSessionRecord(input: {
  walletAddress: string | null
  chainId: string
  sdkEnabled: boolean
  sdkExpiresAt: Date | null | undefined
  sdkGrantee: string | undefined
  backendRecord: AutoSignSessionApprovalDto | null
  backendSyncStatus: SessionApprovalBackendSyncStatus
  forcedStatus?: SessionApprovalRecord["status"]
  previousRecord?: SessionApprovalRecord
}) {
  const base = createInactiveSessionRecord(input.walletAddress)
  const scopeFallback = getSessionSurfaceCopy(
    input.previousRecord?.lastUsedSurface ?? "general",
  )
  const expiresAt =
    toIsoString(input.sdkExpiresAt) ??
    input.backendRecord?.expiresAt ??
    input.previousRecord?.expiresAt ??
    null
  const approvedAt =
    input.backendRecord?.approvedAt ??
    input.previousRecord?.approvedAt ??
    null
  const lastUsedAt =
    input.backendRecord?.lastUsedAt ??
    input.previousRecord?.lastUsedAt ??
    null
  const lastUsedSurface =
    parseLastUsedSurface(input.backendRecord) ??
    input.previousRecord?.lastUsedSurface ??
    null

  const nextRecord: SessionApprovalRecord = {
    ...base,
    sessionId:
      input.backendRecord?.id ??
      (input.sdkEnabled && input.walletAddress
        ? `${input.chainId}:${input.walletAddress}`
        : null),
    walletAddress: input.walletAddress,
    chainId: input.chainId,
    grantee: input.sdkGrantee ?? input.backendRecord?.grantee ?? null,
    approvedAt,
    expiresAt,
    lastUsedAt,
    lastUsedSurface,
    scopeLabel: parseScopeValue(
      input.backendRecord,
      "scopeLabel",
      input.previousRecord?.scopeLabel ?? scopeFallback.scopeLabel,
    ),
    limitLabel: parseScopeValue(
      input.backendRecord,
      "limitLabel",
      input.previousRecord?.limitLabel ?? scopeFallback.limitLabel,
    ),
    providerKind: "interwovenkit_native",
    storageMode: "backend_synced",
    backendSyncStatus: input.backendSyncStatus,
  }

  if (input.forcedStatus) {
    nextRecord.status = input.forcedStatus
    return nextRecord
  }

  if (!input.sdkEnabled) {
    nextRecord.status =
      input.backendRecord?.status === "EXPIRED" ? "expired" : "inactive"
    return nextRecord
  }

  nextRecord.status = getSessionDerivedStatus(
    {
      ...nextRecord,
      status: "active",
    },
    Date.now(),
  )
  return nextRecord
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const auth = useBackendAuth()
  const wallet = useWalletAccount()
  const { autoSign } = useInterwovenKit()
  const chainId = agentCommerceConfig.appchain.interwovenChainId
  const walletAddress = wallet.initiaAddress ?? wallet.address ?? null

  const sdkEnabled = Boolean(autoSign.isEnabledByChain[chainId])
  const sdkExpiresAt = autoSign.expiredAtByChain[chainId] ?? null
  const sdkGrantee = autoSign.granteeByChain[chainId]

  const [backendRecord, setBackendRecord] =
    useState<AutoSignSessionApprovalDto | null>(null)
  const [backendSyncStatus, setBackendSyncStatus] =
    useState<SessionApprovalBackendSyncStatus>("idle")
  const [transientStatus, setTransientStatus] = useState<
    SessionApprovalRecord["status"] | null
  >(null)
  const [session, setSession] = useState<SessionApprovalRecord>(
    createInactiveSessionRecord(),
  )
  const [tick, setTick] = useState(Date.now())

  const sdkEnabledRef = useRef(sdkEnabled)
  const sdkExpiresAtRef = useRef<Date | null | undefined>(sdkExpiresAt)
  const sdkGranteeRef = useRef<string | undefined>(sdkGrantee)

  useEffect(() => {
    sdkEnabledRef.current = sdkEnabled
    sdkExpiresAtRef.current = sdkExpiresAt
    sdkGranteeRef.current = sdkGrantee
  }, [sdkEnabled, sdkExpiresAt, sdkGrantee])

  const refreshBackendSession = useCallback(async () => {
    if (!auth.isAuthenticated || !walletAddress) {
      setBackendRecord(null)
      setBackendSyncStatus("idle")
      return null
    }

    try {
      const response = await agentCommerceApi.getAutoSignSession({
        chainId,
      })
      setBackendRecord(response.data)
      setBackendSyncStatus(response.data ? "synced" : "idle")
      return response.data
    } catch {
      setBackendSyncStatus("error")
      return null
    }
  }, [auth.isAuthenticated, chainId, walletAddress])

  const syncBackendSession = useCallback(
    async (input?: SessionApprovalRequestInput) => {
      if (!auth.isAuthenticated || !walletAddress) {
        setBackendSyncStatus("pending")
        return null
      }

      const scopeCopy = getSessionSurfaceCopy(input?.surface ?? "general")

      try {
        const response = await agentCommerceApi.syncAutoSignSession({
          chainId,
          grantee: sdkGranteeRef.current ?? undefined,
          expiresAt: toIsoString(sdkExpiresAtRef.current) ?? undefined,
          scope: {
            surface: input?.surface ?? "general",
            scopeLabel: input?.scopeLabel ?? scopeCopy.scopeLabel,
            limitLabel: input?.limitLabel ?? scopeCopy.limitLabel,
          },
          metadata: {
            providerKind: "interwovenkit_native",
            source: "frontend-session-provider",
          },
        })

        setBackendRecord(response.data)
        setBackendSyncStatus("synced")
        return response.data
      } catch {
        setBackendSyncStatus("error")
        return null
      }
    },
    [auth.isAuthenticated, chainId, walletAddress],
  )

  const revokeBackendSession = useCallback(async () => {
    if (!auth.isAuthenticated) {
      setBackendRecord(null)
      setBackendSyncStatus("idle")
      return null
    }

    try {
      const response = await agentCommerceApi.revokeAutoSignSession({
        chainId,
        metadata: {
          providerKind: "interwovenkit_native",
          source: "frontend-session-provider",
        },
      })
      setBackendRecord(response.data)
      setBackendSyncStatus(response.data ? "synced" : "idle")
      return response.data
    } catch {
      setBackendSyncStatus("error")
      return null
    }
  }, [auth.isAuthenticated, chainId])

  useEffect(() => {
    void refreshBackendSession()
  }, [refreshBackendSession])

  useEffect(() => {
    setSession((current) =>
      buildSessionRecord({
        walletAddress,
        chainId,
        sdkEnabled,
        sdkExpiresAt,
        sdkGrantee,
        backendRecord,
        backendSyncStatus,
        forcedStatus: transientStatus ?? undefined,
        previousRecord: current,
      }),
    )
  }, [
    backendRecord,
    backendSyncStatus,
    chainId,
    sdkEnabled,
    sdkExpiresAt,
    sdkGrantee,
    transientStatus,
    walletAddress,
  ])

  useEffect(() => {
    if (!sdkEnabled || transientStatus === "requesting") {
      return
    }

    const backendMatches =
      backendRecord?.status === "ACTIVE" &&
      backendRecord.expiresAt === toIsoString(sdkExpiresAt) &&
      backendRecord.grantee === (sdkGrantee ?? null)

    if (!auth.isAuthenticated || backendMatches) {
      return
    }

    void syncBackendSession({
      surface: session.lastUsedSurface ?? "general",
      scopeLabel: session.scopeLabel,
      limitLabel: session.limitLabel,
    })
  }, [
    auth.isAuthenticated,
    backendRecord,
    sdkEnabled,
    sdkExpiresAt,
    sdkGrantee,
    session.lastUsedSurface,
    session.limitLabel,
    session.scopeLabel,
    syncBackendSession,
    transientStatus,
  ])

  useEffect(() => {
    if (sdkEnabled || !auth.isAuthenticated || backendRecord?.status !== "ACTIVE") {
      return
    }

    void revokeBackendSession()
  }, [auth.isAuthenticated, backendRecord?.status, revokeBackendSession, sdkEnabled])

  useEffect(() => {
    if (!session.expiresAt) {
      setTick(Date.now())
      return
    }

    const interval = window.setInterval(() => {
      setTick(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [session.expiresAt])

  const requestSessionApproval = useCallback(
    async (input?: SessionApprovalRequestInput) => {
      if (!walletAddress) {
        return null
      }

      setTransientStatus("requesting")
      setBackendSyncStatus((current) => (current === "idle" ? "pending" : current))

      try {
        const authSession = await auth.ensureAuthenticated()
        if (!authSession) {
          setBackendSyncStatus("error")
          return null
        }

        await autoSign.enable(chainId)
        const syncedRecord = await syncBackendSession(input)

        return buildSessionRecord({
          walletAddress,
          chainId,
          sdkEnabled: sdkEnabledRef.current,
          sdkExpiresAt: sdkExpiresAtRef.current,
          sdkGrantee: sdkGranteeRef.current,
          backendRecord: syncedRecord,
          backendSyncStatus: syncedRecord ? "synced" : "error",
          previousRecord: session,
        })
      } finally {
        setTransientStatus(null)
      }
    },
    [
      auth,
      autoSign,
      chainId,
      session,
      syncBackendSession,
      walletAddress,
    ],
  )

  const extendSessionApproval = useCallback(
    async (input?: SessionApprovalRequestInput) => {
      return requestSessionApproval(input)
    },
    [requestSessionApproval],
  )

  const revokeSessionApproval = useCallback(async () => {
    setTransientStatus("revoking")

    try {
      await autoSign.disable(chainId)
      await revokeBackendSession()
    } finally {
      setTransientStatus(null)
    }
  }, [autoSign, chainId, revokeBackendSession])

  const markSessionUsed = useCallback(
    (surface: SessionApprovalRequestInput["surface"]) => {
      setSession((current) => {
        if (current.status !== "active" && current.status !== "expiring") {
          return current
        }

        return {
          ...current,
          lastUsedAt: new Date().toISOString(),
          lastUsedSurface: surface ?? current.lastUsedSurface ?? "general",
        }
      })

      if (!auth.isAuthenticated) {
        return
      }

      void agentCommerceApi
        .markAutoSignSessionUsed({
          chainId,
          surface: surface ?? "general",
          metadata: {
            providerKind: "interwovenkit_native",
          },
        })
        .then((response) => {
          if (response.data) {
            setBackendRecord(response.data)
            setBackendSyncStatus("synced")
          }
        })
        .catch(() => {
          setBackendSyncStatus("error")
        })
    },
    [auth.isAuthenticated, chainId],
  )

  const remainingMs = getSessionRemainingMs(session, tick)
  const isSessionActive = session.status === "active" || session.status === "expiring"

  const value = useMemo(
    () => ({
      session,
      isSessionActive,
      sessionExpiry: formatSessionCountdown(remainingMs),
      sessionRemainingLabel: formatSessionRemainingLabel(remainingMs),
      requestSessionApproval,
      extendSessionApproval,
      revokeSessionApproval,
      markSessionUsed,
      activateSession: () => requestSessionApproval({ surface: "sidebar" }),
      revokeSession: revokeSessionApproval,
    }),
    [
      extendSessionApproval,
      isSessionActive,
      markSessionUsed,
      remainingMs,
      requestSessionApproval,
      revokeSessionApproval,
      session,
    ],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)

  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider")
  }

  return context
}
