"use client"

import { useCallback, useMemo } from "react"
import { useSession } from "@/components/providers/SessionProvider"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { formatSessionLastUsedLabel, getSessionSurfaceCopy } from "@/lib/session/format"
import type { SessionSurface } from "@/lib/session/types"

type UseSessionApprovalOptions = {
  surface?: SessionSurface
}

function getContextCopy(surface: SessionSurface) {
  switch (surface) {
    case "checkout":
      return {
        inactiveTitle: "Approve once for smoother checkout",
        activeTitle: "Smoother checkout is ready",
        description:
          "After one approval, repeat payments and order follow-ups can feel much smoother during this session.",
      }
    case "agent_profile":
      return {
        inactiveTitle: "Keep agent actions feeling effortless",
        activeTitle: "Quick approvals are ready",
        description:
          "Approve once and repeat hiring or follow-up actions can move with fewer interruptions during this session.",
      }
    case "create_agent":
      return {
        inactiveTitle: "Keep setup steps smooth",
        activeTitle: "Launch flow is ready",
        description:
          "One approval can make repeat setup steps and follow-up actions feel lighter while you are working.",
      }
    case "dashboard":
    case "settings":
    case "sidebar":
    case "general":
    default:
      return {
        inactiveTitle: "Approve once for smoother repeat actions",
        activeTitle: "Smoother repeat actions are ready",
        description:
          "Once approved, AgentCommerce can keep repeat actions feeling almost invisible until this session ends or you turn it off.",
      }
  }
}

export function useSessionApproval(options: UseSessionApprovalOptions = {}) {
  const surface = options.surface ?? "general"
  const session = useSession()
  const wallet = useWalletConnectionFlow()
  const copy = getContextCopy(surface)

  const requestApproval = useCallback(() => {
    const surfaceCopy = getSessionSurfaceCopy(surface)

    return session.requestSessionApproval({
      surface,
      scopeLabel: surfaceCopy.scopeLabel,
      limitLabel: surfaceCopy.limitLabel,
    })
  }, [session, surface])

  const renewApproval = useCallback(() => {
    const surfaceCopy = getSessionSurfaceCopy(surface)

    return session.extendSessionApproval({
      surface,
      scopeLabel: surfaceCopy.scopeLabel,
      limitLabel: surfaceCopy.limitLabel,
    })
  }, [session, surface])

  const turnOff = useCallback(() => {
    return session.revokeSessionApproval()
  }, [session])

  const hasWalletIssue = !wallet.isConnected || !wallet.isOnExpectedAppchain
  const isPending = session.session.status === "requesting"
  const isRevoking = session.session.status === "revoking"
  const isExpiring = session.session.status === "expiring"
  const isExpired = session.session.status === "expired"

  const statusLabel = useMemo(() => {
    if (isPending) {
      return "Preparing"
    }

    if (isRevoking) {
      return "Turning off"
    }

    if (session.isSessionActive && isExpiring) {
      return "Renew soon"
    }

    if (session.isSessionActive && session.session.backendSyncStatus === "pending") {
      return "Syncing"
    }

    if (session.isSessionActive) {
      return "Ready"
    }

    if (isExpired) {
      return "Expired"
    }

    return "Approval needed"
  }, [
    isExpired,
    isExpiring,
    isPending,
    isRevoking,
    session.isSessionActive,
    session.session.backendSyncStatus,
  ])

  const statusTone = useMemo(() => {
    if (isPending || isRevoking) {
      return "secondary" as const
    }

    if (session.isSessionActive && isExpiring) {
      return "warning" as const
    }

    if (session.isSessionActive) {
      return "success" as const
    }

    return "outline" as const
  }, [isExpiring, isPending, isRevoking, session.isSessionActive])

  const primaryActionLabel = useMemo(() => {
    if (!wallet.isConnected) {
      return "Connect account first"
    }

    if (!wallet.isOnExpectedAppchain) {
      return "Switch network first"
    }

    if (isPending) {
      return "Preparing approval"
    }

    if (isRevoking) {
      return "Turning off"
    }

    if (session.isSessionActive && isExpiring) {
      return "Renew smooth actions"
    }

    if (session.isSessionActive) {
      return "Turn off smooth actions"
    }

    if (isExpired) {
      return "Renew approval"
    }

    return "Approve smoother actions"
  }, [
    isExpired,
    isExpiring,
    isPending,
    isRevoking,
    session.isSessionActive,
    wallet.isConnected,
    wallet.isOnExpectedAppchain,
  ])

  const description = useMemo(() => {
    if (!wallet.isConnected) {
      return "Connect your account first, then you can approve one time for smoother repeat actions."
    }

    if (!wallet.isOnExpectedAppchain) {
      return wallet.networkMessage.description
    }

    if (session.isSessionActive) {
      if (session.session.backendSyncStatus === "pending") {
        return `Approved for ${session.sessionRemainingLabel}. We are finishing backend sync so repeat actions can stay smooth across the app.`
      }

      if (session.session.backendSyncStatus === "error") {
        return `Approved for ${session.sessionRemainingLabel}. Your wallet session is live, and AgentCommerce will keep retrying backend sync in the background.`
      }

      return `Approved for ${session.sessionRemainingLabel}. You can keep moving with fewer interruptions and turn it off anytime.`
    }

    if (isExpired) {
      return "Your smoother-action approval ended. Renew it once to keep repeat steps feeling light."
    }

    return copy.description
  }, [
    copy.description,
    isExpired,
    session.isSessionActive,
    session.sessionRemainingLabel,
    wallet.isConnected,
    wallet.isOnExpectedAppchain,
    wallet.networkMessage.description,
  ])

  const helperText = useMemo(() => {
    if (session.isSessionActive) {
      if (session.session.backendSyncStatus === "pending") {
        return "Your wallet approval is active and AgentCommerce is syncing the session details now."
      }

      if (session.session.backendSyncStatus === "error") {
        return "Your wallet approval is active. If backend sync is delayed, AgentCommerce will retry without changing payment or settlement state."
      }

      return `${session.session.scopeLabel}. ${session.session.limitLabel}.`
    }

    return "You stay in control the whole time and can turn this off whenever you want."
  }, [
    session.isSessionActive,
    session.session.limitLabel,
    session.session.scopeLabel,
  ])

  const title = session.isSessionActive ? copy.activeTitle : copy.inactiveTitle

  const onPrimaryAction = useCallback(() => {
    if (!wallet.isConnected) {
      return wallet.connect()
    }

    if (!wallet.isOnExpectedAppchain) {
      return wallet.openWallet()
    }

    if (session.isSessionActive && isExpiring) {
      return renewApproval()
    }

    if (session.isSessionActive) {
      return turnOff()
    }

    return requestApproval()
  }, [
    isExpiring,
    renewApproval,
    requestApproval,
    session.isSessionActive,
    turnOff,
    wallet,
  ])

  return {
    ...session,
    wallet,
    surface,
    title,
    description,
    helperText,
    hasWalletIssue,
    isPending,
    isRevoking,
    isExpiring,
    isExpired,
    statusLabel,
    statusTone,
    primaryActionLabel,
    primaryActionDisabled: isPending || isRevoking,
    canShowSecondaryAction:
      session.isSessionActive && isExpiring && !isPending && !isRevoking,
    requestApproval,
    renewApproval,
    turnOff,
    onPrimaryAction,
    trustBullets: [
      "Approve once, then repeat actions feel much smoother.",
      "Payment and settlement state still comes from on-chain indexing.",
      "You can turn this off anytime.",
    ],
    lastUsedLabel: formatSessionLastUsedLabel(session.session.lastUsedAt),
  }
}
