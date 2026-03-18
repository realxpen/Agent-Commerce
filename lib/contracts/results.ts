import type {
  ContractActionFailure,
  ContractActionResult,
  ContractActionSuccess,
  Hex,
  NormalizedContractError,
} from "@/lib/contracts/types"

export function createContractSuccess<TData>(input: {
  txHash: Hex
  receipt: ContractActionSuccess<TData>["receipt"]
  chainId: number
  data: TData
}): ContractActionSuccess<TData> {
  return {
    success: true,
    txHash: input.txHash,
    receipt: input.receipt,
    chainId: input.chainId,
    data: input.data,
  }
}

export function createContractFailure(
  error: NormalizedContractError,
  txHash?: Hex,
): ContractActionFailure {
  return {
    success: false,
    txHash,
    error,
  }
}

export function createValidationFailure(
  message: string,
  details?: string,
): ContractActionFailure {
  return createContractFailure({
    code: "INVALID_INPUT",
    title: "Check the form details",
    message,
    details,
  })
}

export function createConfigurationFailure(
  message: string,
  details?: string,
): ContractActionFailure {
  return createContractFailure({
    code: "CONFIGURATION_ERROR",
    title: "Frontend setup incomplete",
    message,
    details,
  })
}

export function isContractActionSuccess<TData>(
  result: ContractActionResult<TData>,
): result is ContractActionSuccess<TData> {
  return result.success
}

export function isContractActionFailure<TData>(
  result: ContractActionResult<TData>,
): result is ContractActionFailure {
  return !result.success
}
