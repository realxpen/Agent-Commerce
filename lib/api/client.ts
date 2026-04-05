import { agentCommerceConfig } from "@/lib/appchain/config"
import type {
  AccessTokenProvider,
  AutoSignSessionApprovalDto,
  AuthChallengeDto,
  AuthChallengeInput,
  AuthSessionDto,
  AttachOrderDeliverableInput,
  AgentDto,
  AgentServiceDto,
  CreateServiceMetadataInput,
  CreateAgentMetadataInput,
  CreateOrderRecordInput,
  CreatePaymentRecordInput,
  CurrentAuthSessionDto,
  DashboardStatsDto,
  DataResponse,
  DemoFaucetRequestDto,
  DemoFaucetRequestInput,
  DemoFaucetStatusDto,
  ListAgentsParams,
  ListCustomerOrdersParams,
  ListDashboardStatsParams,
  ListOwnerOrdersParams,
  ListServicesParams,
  ListTasksParams,
  ListTransactionsParams,
  MarkAutoSignSessionUsedInput,
  NormalizedApiError,
  OrderDto,
  PaginatedResponse,
  RequestOrderRevisionInput,
  RevokeAutoSignSessionInput,
  SyncAutoSignSessionInput,
  TaskDto,
  TransactionDto,
  TriggerTaskProcessingInput,
  TriggerTaskProcessingResult,
  UpdateAgentMetadataInput,
  UpdateOrderStatusInput,
  UpdateServiceMetadataInput,
  UploadedReferenceFileDto,
  UploadReferenceFileInput,
  VerifyWalletAuthInput,
} from "@/lib/api/types"

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  query?: Record<string, QueryValue>
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  authToken?: string | null
}

type ApiClientOptions = {
  baseUrl?: string
  getAccessToken?: AccessTokenProvider
}

const runtimeAuth: {
  accessToken: string | null
  getAccessToken: AccessTokenProvider | null
} = {
  accessToken: null,
  getAccessToken: null,
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>) {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`)

  if (!query) {
    return url.toString()
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item))
      }
      continue
    }

    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

function normalizeApiError(input: {
  status: number | null
  payload?: unknown
  fallbackMessage?: string
  code?: NormalizedApiError["code"]
  title?: string
  details?: NormalizedApiError["details"]
}): NormalizedApiError {
  const {
    code,
    details,
    fallbackMessage = "Something went wrong while talking to AgentCommerce.",
    payload,
    status,
    title,
  } = input

  const payloadMessage =
    payload && typeof payload === "object" && "message" in payload
      ? String(payload.message)
      : null
  const payloadError =
    payload && typeof payload === "object" && "error" in payload
      ? String(payload.error)
      : null

  const message = payloadMessage ?? fallbackMessage
  const normalizedDetails = details ?? payloadError

  if (code === "CONFIG_ERROR") {
    return {
      status,
      code,
      title: title ?? "Frontend setup incomplete",
      message,
      details: normalizedDetails,
    }
  }

  if (status === 400) {
    return {
      status,
      code: "BAD_REQUEST",
      title: "Request invalid",
      message,
      details: normalizedDetails,
    }
  }

  if (status === 401) {
    return {
      status,
      code: "UNAUTHORIZED",
      title: "Sign in required",
      message: payloadMessage ?? "You need to sign in before continuing.",
      details: normalizedDetails,
    }
  }

  if (status === 403) {
    return {
      status,
      code: "FORBIDDEN",
      title: "Access blocked",
      message: payloadMessage ?? "You do not have permission to perform this action.",
      details: normalizedDetails,
    }
  }

  if (status === 404) {
    return {
      status,
      code: "NOT_FOUND",
      title: "Not found",
      message: payloadMessage ?? "The requested AgentCommerce resource could not be found.",
      details: normalizedDetails,
    }
  }

  if (status === 409) {
    return {
      status,
      code: "CONFLICT",
      title: "State changed",
      message: payloadMessage ?? "This action could not be completed because the resource state has changed.",
      details: normalizedDetails,
    }
  }

  if (status === 429) {
    return {
      status,
      code: "RATE_LIMITED",
      title: "Too many requests",
      message: payloadMessage ?? "Please wait a moment and try again.",
      details: normalizedDetails,
    }
  }

  if (status !== null && status >= 500) {
    return {
      status,
      code: "SERVER_ERROR",
      title: "Server issue",
      message: payloadMessage ?? "The AgentCommerce backend hit a temporary issue.",
      details: normalizedDetails,
    }
  }

  return {
    status,
    code: status === null ? "NETWORK_ERROR" : "UNKNOWN",
    title:
      title ??
      (status === null ? "Connection issue" : "Request failed"),
    message,
    details: normalizedDetails,
  }
}

export class AgentCommerceApiError extends Error {
  status: number | null
  code: NormalizedApiError["code"]
  title: string
  details?: NormalizedApiError["details"]

  constructor(error: NormalizedApiError) {
    super(error.message)
    this.name = "AgentCommerceApiError"
    this.status = error.status
    this.code = error.code
    this.title = error.title
    this.details = error.details
  }
}

async function parseResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  try {
    return await response.text()
  } catch {
    return null
  }
}

async function resolveAccessToken(
  overrideToken?: string | null,
  getAccessToken?: AccessTokenProvider,
) {
  if (overrideToken !== undefined) {
    return overrideToken
  }

  if (getAccessToken) {
    return getAccessToken()
  }

  if (runtimeAuth.getAccessToken) {
    return runtimeAuth.getAccessToken()
  }

  return runtimeAuth.accessToken
}

export function configureAgentCommerceApiAuth(options: {
  accessToken?: string | null
  getAccessToken?: AccessTokenProvider | null
}) {
  if (options.accessToken !== undefined) {
    runtimeAuth.accessToken = options.accessToken
  }

  if (options.getAccessToken !== undefined) {
    runtimeAuth.getAccessToken = options.getAccessToken
  }
}

export class AgentCommerceApiClient {
  private baseUrl: string
  private getAccessToken?: AccessTokenProvider

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? agentCommerceConfig.apiBaseUrl
    this.getAccessToken = options.getAccessToken
  }

  async request<TResponse>(path: string, options: RequestOptions = {}) {
    if (!agentCommerceConfig.status.apiReady) {
      throw new AgentCommerceApiError(
        normalizeApiError({
          status: null,
          code: "CONFIG_ERROR",
          title: agentCommerceConfig.status.title,
          fallbackMessage:
            "Add NEXT_PUBLIC_API_BASE_URL before the frontend can load live AgentCommerce backend data.",
          details: agentCommerceConfig.status.issues
            .filter((issue) => issue.name === "NEXT_PUBLIC_API_BASE_URL")
            .map((issue) => issue.message)
            .join(" "),
        }),
      )
    }

    const url = buildUrl(this.baseUrl, path, options.query)
    const token = await resolveAccessToken(options.authToken, this.getAccessToken)
    const headers = new Headers(options.headers)

    headers.set("accept", "application/json")

    if (options.body !== undefined) {
      headers.set("content-type", "application/json")
    }

    if (token) {
      headers.set("authorization", `Bearer ${token}`)
    }

    let response: Response

    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      })
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : ""
      const normalizedMessage = rawMessage.toLowerCase()
      const isAbortError =
        error instanceof DOMException && error.name === "AbortError"
      const isNetworkError =
        normalizedMessage.includes("failed to fetch") ||
        normalizedMessage.includes("networkerror") ||
        normalizedMessage.includes("network request failed") ||
        normalizedMessage.includes("load failed") ||
        normalizedMessage.includes("econnrefused") ||
        normalizedMessage.includes("err_name_not_resolved") ||
        normalizedMessage.includes("fetch failed")

      throw new AgentCommerceApiError(
        normalizeApiError({
          status: null,
          title: isAbortError
            ? "Request interrupted"
            : isNetworkError
              ? "Can't reach the backend"
              : "Connection issue",
          fallbackMessage: isAbortError
            ? "The request was interrupted before it finished. Try again if you still need this data."
            : isNetworkError
              ? "We couldn't reach the AgentCommerce backend. Check your connection and backend URL, then try again."
              : rawMessage || "Unable to reach the AgentCommerce backend.",
          details: rawMessage || null,
        }),
      )
    }

    const payload = await parseResponsePayload(response)

    if (!response.ok) {
      throw new AgentCommerceApiError(
        normalizeApiError({
          status: response.status,
          payload,
          fallbackMessage: `Request failed with status ${response.status}.`,
        }),
      )
    }

    return payload as TResponse
  }

  listAgents(params: ListAgentsParams = {}, signal?: AbortSignal) {
    return this.request<PaginatedResponse<AgentDto>>("/api/v1/agents", {
      query: params,
      signal,
    })
  }

  getAgent(agentId: string, signal?: AbortSignal) {
    return this.request<DataResponse<AgentDto>>(`/api/v1/agents/${agentId}`, {
      signal,
    })
  }

  createAuthChallenge(input: AuthChallengeInput, signal?: AbortSignal) {
    return this.request<DataResponse<AuthChallengeDto>>("/api/v1/auth/challenge", {
      method: "POST",
      body: input,
      signal,
    })
  }

  verifyAuthChallenge(input: VerifyWalletAuthInput, signal?: AbortSignal) {
    return this.request<DataResponse<AuthSessionDto>>("/api/v1/auth/verify", {
      method: "POST",
      body: input,
      signal,
    })
  }

  getAuthSession(signal?: AbortSignal) {
    return this.request<DataResponse<CurrentAuthSessionDto>>("/api/v1/auth/me", {
      signal,
    })
  }

  getAutoSignSession(params: { chainId?: string } = {}, signal?: AbortSignal) {
    return this.request<DataResponse<AutoSignSessionApprovalDto | null>>(
      "/api/v1/session-approvals/auto-sign",
      {
        query: params,
        signal,
      },
    )
  }

  syncAutoSignSession(input: SyncAutoSignSessionInput, signal?: AbortSignal) {
    return this.request<DataResponse<AutoSignSessionApprovalDto>>(
      "/api/v1/session-approvals/auto-sign/sync",
      {
        method: "POST",
        body: input,
        signal,
      },
    )
  }

  revokeAutoSignSession(
    input: RevokeAutoSignSessionInput = {},
    signal?: AbortSignal,
  ) {
    return this.request<DataResponse<AutoSignSessionApprovalDto | null>>(
      "/api/v1/session-approvals/auto-sign/revoke",
      {
        method: "POST",
        body: input,
        signal,
      },
    )
  }

  markAutoSignSessionUsed(
    input: MarkAutoSignSessionUsedInput,
    signal?: AbortSignal,
  ) {
    return this.request<DataResponse<AutoSignSessionApprovalDto | null>>(
      "/api/v1/session-approvals/auto-sign/use",
      {
        method: "POST",
        body: input,
        signal,
      },
    )
  }

  getDemoFaucetStatus(signal?: AbortSignal) {
    return this.request<DataResponse<DemoFaucetStatusDto>>(
      "/api/v1/demo-faucet/status",
      {
        signal,
      },
    )
  }

  requestDemoFaucet(input: DemoFaucetRequestInput = {}, signal?: AbortSignal) {
    return this.request<DataResponse<DemoFaucetRequestDto>>(
      "/api/v1/demo-faucet/request",
      {
        method: "POST",
        body: input,
        signal,
      },
    )
  }

  createAgentMetadata(input: CreateAgentMetadataInput, signal?: AbortSignal) {
    return this.request<DataResponse<AgentDto>>("/api/v1/agents", {
      method: "POST",
      body: input,
      signal,
    })
  }

  updateAgent(agentId: string, input: UpdateAgentMetadataInput, signal?: AbortSignal) {
    return this.request<DataResponse<AgentDto>>(`/api/v1/agents/${agentId}`, {
      method: "PATCH",
      body: input,
      signal,
    })
  }

  publishAgent(agentId: string, signal?: AbortSignal) {
    return this.request<DataResponse<AgentDto>>(`/api/v1/agents/${agentId}/publish`, {
      method: "POST",
      signal,
    })
  }

  listServices(params: ListServicesParams = {}, signal?: AbortSignal) {
    const path = params.agentId
      ? `/api/v1/agents/${params.agentId}/services`
      : "/api/v1/services"

    return this.request<PaginatedResponse<AgentServiceDto>>(path, {
      query: params.agentId ? { status: params.status, page: params.page, pageSize: params.pageSize } : params,
      signal,
    })
  }

  getService(serviceId: string, signal?: AbortSignal) {
    return this.request<DataResponse<AgentServiceDto>>(`/api/v1/services/${serviceId}`, {
      signal,
    })
  }

  createService(
    agentId: string,
    input: CreateServiceMetadataInput,
    signal?: AbortSignal,
  ) {
    return this.request<DataResponse<AgentServiceDto>>(`/api/v1/agents/${agentId}/services`, {
      method: "POST",
      body: input,
      signal,
    })
  }

  updateService(
    serviceId: string,
    input: UpdateServiceMetadataInput,
    signal?: AbortSignal,
  ) {
    return this.request<DataResponse<AgentServiceDto>>(`/api/v1/services/${serviceId}`, {
      method: "PATCH",
      body: input,
      signal,
    })
  }

  publishService(serviceId: string, signal?: AbortSignal) {
    return this.request<DataResponse<AgentServiceDto>>(`/api/v1/services/${serviceId}/publish`, {
      method: "POST",
      signal,
    })
  }

  createOrderRecord(input: CreateOrderRecordInput, signal?: AbortSignal) {
    return this.request<DataResponse<OrderDto>>("/api/v1/orders", {
      method: "POST",
      body: input,
      signal,
    })
  }

  createPaymentRecord(input: CreatePaymentRecordInput, signal?: AbortSignal) {
    return this.request<DataResponse<TransactionDto>>("/api/v1/payments", {
      method: "POST",
      body: input,
      signal,
    })
  }

  getOrder(orderId: string, signal?: AbortSignal) {
    return this.request<DataResponse<OrderDto>>(`/api/v1/orders/${orderId}`, {
      signal,
    })
  }

  listCustomerOrders(
    customerId: string,
    params: ListCustomerOrdersParams = {},
    signal?: AbortSignal,
  ) {
    return this.request<PaginatedResponse<OrderDto>>(
      `/api/v1/orders/customer/${customerId}`,
      {
        query: params,
        signal,
      },
    )
  }

  listOwnerOrders(
    ownerId: string,
    params: ListOwnerOrdersParams = {},
    signal?: AbortSignal,
  ) {
    return this.request<PaginatedResponse<OrderDto>>(`/api/v1/orders/owner/${ownerId}`, {
      query: params,
      signal,
    })
  }

  attachOrderDeliverable(
    orderId: string,
    input: AttachOrderDeliverableInput,
    signal?: AbortSignal,
  ) {
    return this.request<DataResponse<OrderDto>>(
      `/api/v1/orders/${orderId}/deliverable`,
      {
        method: "POST",
        body: input,
        signal,
      },
    )
  }

  requestOrderRevision(
    orderId: string,
    input: RequestOrderRevisionInput,
    signal?: AbortSignal,
  ) {
    return this.request<DataResponse<OrderDto>>(`/api/v1/orders/${orderId}/revision-request`, {
      method: "POST",
      body: input,
      signal,
    })
  }

  updateOrderStatus(
    orderId: string,
    input: UpdateOrderStatusInput,
    signal?: AbortSignal,
  ) {
    return this.request<DataResponse<OrderDto>>(`/api/v1/orders/${orderId}/status`, {
      method: "PATCH",
      body: input,
      signal,
    })
  }

  uploadReferenceFile(input: UploadReferenceFileInput, signal?: AbortSignal) {
    return this.request<DataResponse<UploadedReferenceFileDto>>("/api/v1/uploads", {
      method: "POST",
      body: input,
      signal,
    })
  }

  markOrderCompleted(orderId: string, signal?: AbortSignal) {
    return this.request<DataResponse<OrderDto>>(`/api/v1/orders/${orderId}/complete`, {
      method: "POST",
      signal,
    })
  }

  listDashboardStats(params: ListDashboardStatsParams = {}, signal?: AbortSignal) {
    return this.request<DataResponse<DashboardStatsDto>>("/api/v1/dashboard/stats", {
      query: params,
      signal,
    })
  }

  listTransactions(params: ListTransactionsParams = {}, signal?: AbortSignal) {
    return this.request<PaginatedResponse<TransactionDto>>("/api/v1/payments", {
      query: params,
      signal,
    })
  }

  listTasks(params: ListTasksParams = {}, signal?: AbortSignal) {
    return this.request<PaginatedResponse<TaskDto>>("/api/v1/ai-tasks/runs", {
      query: params,
      signal,
    })
  }

  triggerOrderTaskProcessing(
    orderId: string,
    input: TriggerTaskProcessingInput = {},
    signal?: AbortSignal,
  ) {
    return this.request<TriggerTaskProcessingResult>(
      `/api/v1/ai-tasks/orders/${orderId}/trigger`,
      {
        method: "POST",
        body: input,
        signal,
      },
    )
  }
}

export const agentCommerceApi = new AgentCommerceApiClient()

export function getApiErrorMessage(error: unknown) {
  if (error instanceof AgentCommerceApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unexpected API error"
}

export function getApiErrorTitle(error: unknown) {
  if (error instanceof AgentCommerceApiError) {
    return error.title
  }

  return "Request failed"
}

export function isApiError(error: unknown): error is AgentCommerceApiError {
  return error instanceof AgentCommerceApiError
}
