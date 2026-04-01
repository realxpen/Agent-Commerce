"use client"

import { useMemo } from "react"
import { useAgent, useDashboardStats, useServices } from "@/hooks/api"
import { useWalletConnectionFlow } from "@/hooks/wallet"
import { isApiError } from "@/lib/api"
import type { AgentServiceDto } from "@/lib/api/types"
import { buildCheckoutHref } from "@/lib/orders/checkout"

function getPrimaryService(services: AgentServiceDto[]) {
  return (
    services.find((service) => service.status === "ACTIVE") ??
    services[0] ??
    null
  )
}

export function useAgentProfile(agentId: string) {
  const wallet = useWalletConnectionFlow()
  const agentQuery = useAgent(agentId)
  const servicesQuery = useServices(
    {
      agentId,
      status: "ACTIVE",
      page: 1,
      pageSize: 12,
    },
    {
      enabled: Boolean(agentId),
    },
  )
  const dashboardStatsQuery = useDashboardStats(
    {
      agentId,
    },
    {
      enabled: Boolean(agentId),
    },
  )

  const agent = agentQuery.data?.data ?? null
  const services = servicesQuery.data?.data ?? []
  const primaryService = getPrimaryService(services)

  const servicesUnavailable =
    servicesQuery.isError &&
    isApiError(servicesQuery.error) &&
    servicesQuery.error.status === 404

  const statsUnavailable =
    dashboardStatsQuery.isError &&
    isApiError(dashboardStatsQuery.error) &&
    dashboardStatsQuery.error.status === 404

  const orderCta = useMemo(() => {
    if (!primaryService) {
      return {
        disabled: true,
        href: null,
        label: "Order not available yet",
        helperText:
          "This agent does not have a checkout-ready service published yet.",
      }
    }

    if (!wallet.isConfigured) {
      return {
        disabled: true,
        href: null,
        label: "Frontend setup required",
        helperText: wallet.networkMessage.description,
      }
    }

    if (!wallet.isConnected) {
      return {
        disabled: true,
        href: null,
        label: "Connect wallet to order",
        helperText: "Connect your wallet before starting an on-chain order.",
      }
    }

    if (!wallet.isOnExpectedAppchain) {
      return {
        disabled: true,
        href: null,
        label: "Switch network to continue",
        helperText: wallet.networkMessage.description,
      }
    }

    return {
      disabled: false,
      href:
        agent && primaryService
          ? buildCheckoutHref({
              agent,
              service: primaryService,
            })
          : null,
      label: "Hire Agent",
      helperText: "Payment is handled through the appchain checkout flow.",
      }
  }, [
    agent,
    primaryService,
    wallet.isConfigured,
    wallet.isConnected,
    wallet.isOnExpectedAppchain,
    wallet.networkMessage.description,
  ])

  return {
    agent,
    services,
    primaryService,
    wallet,
    orderCta,
    isLoading: agentQuery.isLoading,
    isError: agentQuery.isError,
    error: agentQuery.error,
    refetch: agentQuery.refetch,
    servicesQuery,
    servicesUnavailable,
    dashboardStats: dashboardStatsQuery.data?.data ?? null,
    dashboardStatsQuery,
    statsUnavailable,
  }
}
