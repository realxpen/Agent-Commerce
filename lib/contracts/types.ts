export type ContractAddress = `0x${string}`
export type Hex = `0x${string}`

export type ContractReceiptLog = {
  address: ContractAddress
  topics: readonly Hex[]
  data?: Hex
}

export type TransactionReceipt = {
  transactionHash?: Hex
  blockHash?: Hex
  status?: string
  logs: readonly ContractReceiptLog[]
} & Record<string, unknown>

export type ContractActionStatus =
  | "idle"
  | "preparing"
  | "awaiting_wallet"
  | "submitting"
  | "pending"
  | "confirmed"
  | "failed"

export type ContractErrorCode =
  | "CONFIGURATION_ERROR"
  | "USER_REJECTED"
  | "WRONG_NETWORK"
  | "INSUFFICIENT_FUNDS"
  | "WALLET_NOT_CONNECTED"
  | "NETWORK_ERROR"
  | "CONTRACT_REVERTED"
  | "INVALID_INPUT"
  | "UNKNOWN"

export type NormalizedContractError = {
  code: ContractErrorCode
  title: string
  message: string
  details?: string
}

export type ContractExecutionOptions = {
  onAwaitingWallet?: () => void
  onSubmitting?: (txHash: Hex) => void
  onSubmitted?: (txHash: Hex) => void
  onPending?: (txHash: Hex) => void
  onConfirmed?: (txHash: Hex, receipt: TransactionReceipt) => void
  onFailed?: (error: NormalizedContractError, txHash?: Hex) => void
}

export type ContractActionSuccess<TData> = {
  success: true
  txHash: Hex
  receipt: TransactionReceipt
  chainId: number
  data: TData
}

export type ContractActionFailure = {
  success: false
  txHash?: Hex
  error: NormalizedContractError
}

export type ContractActionResult<TData> =
  | ContractActionSuccess<TData>
  | ContractActionFailure
