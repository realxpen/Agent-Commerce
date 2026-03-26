export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

export type AgentStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"
export type AgentPricingModel =
  | "FIXED_PRICE"
  | "USAGE_BASED"
  | "SUBSCRIPTION"
  | "CUSTOM"
export type AgentServiceStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
export type OrderPaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED"
export type DeliveryStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"
export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "CONFIRMED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELED"
export type PaymentConfirmationStatus =
  | "UNCONFIRMED"
  | "CONFIRMING"
  | "CONFIRMED"
  | "FINALIZED"
  | "FAILED"
export type TaskRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "RETRYING"
  | "CANCELED"
  | "TIMED_OUT"

export type PaginationMeta = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type DataResponse<TData> = {
  data: TData
}

export type PaginatedResponse<TData> = {
  data: TData[]
  meta: PaginationMeta
}

export type AgentDto = {
  id: string
  ownerId: string
  name: string
  slug: string
  category: string
  description: string
  pricingModel: AgentPricingModel
  appchainId: string | null
  contractAddress: string | null
  treasuryAddress: string
  status: AgentStatus
  initUsername: string | null
  metadata: JsonValue | null
  serviceCount: number
  orderCount: number
  createdAt: string
  updatedAt: string
}

export type AgentServiceDto = {
  id: string
  agentId: string
  slug: string
  title: string
  description: string | null
  status: AgentServiceStatus
  pricing: {
    amount: string
    currency: string | null
    denom: string
  }
  estimatedDeliveryMinutes: number | null
  metadata: JsonValue | null
  createdAt: string
  updatedAt: string
  agent?: {
    id: string
    name: string
    slug: string
    category: string
    pricingModel: AgentPricingModel
    treasuryAddress: string
  }
}

export type OrderDto = {
  id: string
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  deliveryStatus: DeliveryStatus
  customerId: string
  customer: {
    id: string
    displayName: string | null
    email: string | null
  }
  agent: {
    id: string
    ownerId: string
    name: string
    slug: string
    category: string
    treasuryAddress: string
  }
  service: {
    id: string
    slug: string
    title: string
    snapshot: JsonValue
  }
  pricing: {
    quotedPrice: string
    finalPaidAmount: string | null
    currency: string | null
    denom: string
    quantity: number
  }
  customerNote: string | null
  payment: {
    reference: string | null
    txHash: string | null
    expectedInfo: JsonValue
    paidAt: string | null
  }
  delivery: {
    url: string | null
    text: string | null
    deliveredAt: string | null
    completedAt: string | null
  }
  failedAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export type TransactionDto = {
  id: string
  orderId: string
  agentId: string
  chainId: string
  paymentReference: string | null
  txHash: string | null
  amount: string
  feeAmount: string
  currency: string | null
  denom: string
  sender: string
  recipient: string
  status: PaymentStatus
  confirmationStatus: PaymentConfirmationStatus
  confirmationCount: number
  blockHeight: string | null
  confirmedAt: string | null
  finalizedAt: string | null
  failureReason: string | null
  order: {
    id: string
    customerId: string
    status: string
    paymentStatus: string
    serviceTitle: string
    paymentReference: string | null
    txHash: string | null
  }
  agent: {
    id: string
    ownerId: string
    name: string
    slug: string
    treasuryAddress: string
  }
  createdAt: string
  updatedAt: string
}

export type TaskDto = {
  id: string
  agentTaskId: string
  orderId: string | null
  queueJobId: string | null
  status: TaskRunStatus
  attemptNumber: number
  maxAttempts: number
  input: JsonValue
  output: JsonValue
  errorMessage: string | null
  errorDetails: JsonValue
  startedAt: string | null
  completedAt: string | null
  nextRetryAt: string | null
  createdAt: string
  updatedAt: string
  agentTask: {
    id: string
    agentId: string
    agentServiceId: string | null
    name: string
    slug: string
    type: string
    provider: string | null
    model: string | null
    status: string
  }
  order: {
    id: string
    status: string
    paymentStatus: string
    deliveryStatus: string
    serviceTitle: string
    customerNote: string | null
    paymentReference: string | null
    txHash: string | null
    quotedPriceAmount: string
    finalPaidAmount: string | null
    currency: string | null
    denom: string
    customer: {
      id: string
      displayName: string | null
      email: string | null
    }
    agent: {
      id: string
      ownerId: string
      name: string
      slug: string
      treasuryAddress: string
    }
  } | null
}

export type DashboardStatsDto = {
  range: string
  totals: {
    totalAgents: number
    activeAgents: number
    totalOrders: number
    paidOrders: number
    totalTransactions: number
    totalTasks: number
    grossRevenue: string
    netRevenue: string
    pendingRevenue: string
  }
  treasury: {
    availableBalance: string
    pendingBalance: string
    denom: string | null
  }
  trends: Array<{
    label: string
    grossRevenue: string
    netRevenue: string
    orderCount: number
    paymentCount: number
  }>
}

export type CreateAgentMetadataInput = {
  name: string
  category: string
  description: string
  pricingModel: AgentPricingModel
  treasuryAddress: string
  initUsername?: string
  appchainId?: string
  contractAddress?: string
  metadata?: Record<string, JsonValue>
}

export type UpdateAgentMetadataInput = {
  name?: string
  category?: string
  description?: string
  pricingModel?: AgentPricingModel
  treasuryAddress?: string
  initUsername?: string | null
  appchainId?: string | null
  contractAddress?: string | null
  metadata?: Record<string, JsonValue> | null
}

export type CreateServiceMetadataInput = {
  title: string
  description: string
  priceAmount: string
  priceCurrency?: string
  priceDenom: string
  estimatedDeliveryMinutes?: number
  metadata?: Record<string, JsonValue>
}

export type UpdateServiceMetadataInput = {
  title?: string
  description?: string
  priceAmount?: string
  priceCurrency?: string | null
  priceDenom?: string
  estimatedDeliveryMinutes?: number | null
  metadata?: Record<string, JsonValue> | null
}

export type ListAgentsParams = {
  ownerId?: string
  status?: AgentStatus
  category?: string
  pricingModel?: AgentPricingModel
  page?: number
  pageSize?: number
}

export type ListServicesParams = {
  agentId?: string
  ownerId?: string
  status?: AgentServiceStatus
  page?: number
  pageSize?: number
}

export type CreateOrderRecordInput = {
  agentServiceId: string
  quantity?: number
  customerNote?: string
  paymentReference?: string
  txHash?: string
  expectedPayment?: {
    chainId: string
    amount?: string
    currency?: string
    denom?: string
    payerAddress?: string
    recipientAddress?: string
    paymentReference?: string
    txHash?: string
  }
}

export type AttachOrderDeliverableInput = {
  deliveryUrl?: string
  deliveryText?: string
}

export type ListDashboardStatsParams = {
  ownerId?: string
  agentId?: string
  range?: string
}

export type ListTransactionsParams = {
  ownerId?: string
  agentId?: string
  orderId?: string
  status?: PaymentStatus
  page?: number
  pageSize?: number
}

export type ListTasksParams = {
  ownerId?: string
  agentId?: string
  orderId?: string
  status?: TaskRunStatus
  page?: number
  pageSize?: number
}

export type ApiErrorCode =
  | "CONFIG_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN"

export type NormalizedApiError = {
  status: number | null
  code: ApiErrorCode
  title: string
  message: string
  details?: JsonValue | string | null
}

export type AccessTokenProvider = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>

export type WalletAuthAlgo = "secp256k1" | "ethsecp256k1"
export type WalletAuthMethod = "adr36" | "eip191"

export type Adr36SignDoc = {
  chain_id: string
  account_number: string
  sequence: string
  fee: {
    gas: string
    amount: ReadonlyArray<{
      denom: string
      amount: string
    }>
  }
  msgs: ReadonlyArray<{
    type: string
    value: {
      signer: string
      data: string
    }
  }>
  memo: string
}

export type AuthChallengeInput = {
  address: string
  chainId: string
  algo?: WalletAuthAlgo
}

export type VerifyWalletAuthInput = {
  address: string
  chainId: string
  nonce: string
  signature: string
  publicKey?: string
  algo?: WalletAuthAlgo
  method?: WalletAuthMethod
  signDoc?: Adr36SignDoc
}

export type AuthWalletDto = {
  id: string
  chainId: string
  address: string
  label: string | null
  type: string
  status: string
  isPrimary: boolean
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AuthUserDto = {
  id: string
  displayName: string | null
  status: string
  createdAt: string
  updatedAt: string
  wallets: AuthWalletDto[]
}

export type AuthChallengeDto = {
  nonce: string
  requestId: string
  address: string
  chainId: string
  message: string
  expiresAt: string
}

export type AuthSessionDto = {
  tokenType: "Bearer"
  accessToken: string
  expiresAt: string
  user: AuthUserDto
  activeWallet: AuthWalletDto
  meta: {
    isNewUser: boolean
    linkedWallet: boolean
  }
}

export type CurrentAuthSessionDto = Pick<AuthSessionDto, "user" | "activeWallet">

export type AutoSignSessionApprovalDto = {
  id: string
  userId: string
  walletId: string | null
  walletAddress: string | null
  chainId: string
  approvalType: "AUTO_SIGN"
  status: "PENDING" | "ACTIVE" | "USED" | "EXPIRED" | "REVOKED" | "REJECTED"
  approvalKey: string
  grantee: string | null
  scope: JsonValue | null
  metadata: JsonValue | null
  approvedAt: string | null
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

export type SyncAutoSignSessionInput = {
  chainId?: string
  grantee?: string
  expiresAt?: string
  scope?: Record<string, JsonValue>
  metadata?: Record<string, JsonValue>
}

export type RevokeAutoSignSessionInput = {
  chainId?: string
  metadata?: Record<string, JsonValue>
}

export type MarkAutoSignSessionUsedInput = {
  chainId?: string
  surface?: string
  metadata?: Record<string, JsonValue>
}
