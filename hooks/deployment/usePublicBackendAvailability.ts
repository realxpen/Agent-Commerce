"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { agentCommerceConfig } from "@/lib/appchain/config"

type PublicBackendAvailabilityState = "checking" | "live" | "preview"

export type PublicBackendAvailability = {
  state: PublicBackendAvailabilityState
  canUseLiveData: boolean
  title: string
  description: string
  checkedAt: string | null
  statusCode: number | null
}

type PublicBackendAvailabilityResult = PublicBackendAvailability & {
  isChecking: boolean
  refetch: () => Promise<unknown>
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"])

function buildUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString()
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

function describeConfiguredBackend(baseUrl: string) {
  const hostname = getHostname(baseUrl)

  if (!hostname) {
    return "This deployment has an invalid public backend URL, so live marketplace and dashboard data stay disabled."
  }

  if (LOCAL_HOSTS.has(hostname)) {
    return "This public frontend is still configured for a localhost backend, so live marketplace, checkout, and dashboard data are not reachable from the browser."
  }

  if (hostname.endsWith(".agentcommerce.xyz")) {
    return "This public frontend is still pointing at a planned AgentCommerce backend URL that is not live yet, so live data falls back to preview mode."
  }

  return `The frontend could not reach the configured backend at ${baseUrl}, so live data falls back to preview mode on this deployment.`
}

function getStaticPreviewState(): PublicBackendAvailability | null {
  if (!agentCommerceConfig.status.apiReady) {
    return {
      state: "preview",
      canUseLiveData: false,
      title: "Public frontend preview",
      description:
        "This deployment does not have a live public backend URL configured yet, so it runs in frontend-only preview mode.",
      checkedAt: null,
      statusCode: null,
    }
  }

  const hostname = getHostname(agentCommerceConfig.apiBaseUrl)

  if (hostname && LOCAL_HOSTS.has(hostname)) {
    return {
      state: "preview",
      canUseLiveData: false,
      title: "Local backend only",
      description: describeConfiguredBackend(agentCommerceConfig.apiBaseUrl),
      checkedAt: null,
      statusCode: null,
    }
  }

  return null
}

async function probePublicBackend(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<PublicBackendAvailability> {
  const controller = new AbortController()
  const forwardAbort = () => controller.abort()
  const timeoutId = window.setTimeout(() => controller.abort(), 4000)

  signal?.addEventListener("abort", forwardAbort, { once: true })

  try {
    const response = await fetch(buildUrl(baseUrl, "/api/v1/health"), {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    })

    if (response.ok) {
      return {
        state: "live",
        canUseLiveData: true,
        title: "Live backend connected",
        description:
          "This deployment can reach the public AgentCommerce backend, so marketplace, checkout, and dashboard data are using live responses.",
        checkedAt: new Date().toISOString(),
        statusCode: response.status,
      }
    }

    return {
      state: "preview",
      canUseLiveData: false,
      title: "Backend rollout still pending",
      description:
        response.status === 503
          ? "The public backend responded, but it is not healthy enough for live marketplace and checkout flows yet."
          : `The public backend responded with status ${response.status}, so this deployment falls back to frontend-only preview mode.`,
      checkedAt: new Date().toISOString(),
      statusCode: response.status,
    }
  } catch {
    return {
      state: "preview",
      canUseLiveData: false,
      title: "Public backend not live on this deployment",
      description: describeConfiguredBackend(baseUrl),
      checkedAt: new Date().toISOString(),
      statusCode: null,
    }
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener("abort", forwardAbort)
  }
}

export function usePublicBackendAvailability(): PublicBackendAvailabilityResult {
  const staticPreviewState = useMemo(() => getStaticPreviewState(), [])

  const query = useQuery({
    queryKey: ["deployment", "public-backend", agentCommerceConfig.apiBaseUrl],
    queryFn: ({ signal }) =>
      probePublicBackend(agentCommerceConfig.apiBaseUrl, signal),
    enabled: staticPreviewState === null,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const data =
    staticPreviewState ??
    query.data ?? {
      state: "checking",
      canUseLiveData: false,
      title: "Checking public backend",
      description:
        "AgentCommerce is checking whether this deployment can reach a live public backend before enabling live marketplace and dashboard data.",
      checkedAt: null,
      statusCode: null,
    }

  return {
    ...data,
    isChecking: staticPreviewState === null && !query.data && query.isLoading,
    refetch: query.refetch,
  }
}
