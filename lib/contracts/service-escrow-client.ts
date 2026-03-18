import { agentCommerceConfig } from "@/lib/appchain/config"
import { serviceEscrowAbi } from "@/lib/contracts/abis/service-escrow"
import { getPrimaryIndexedIdFromReceipt } from "@/lib/contracts/receipts"
import { createValidationFailure } from "@/lib/contracts/results"
import { executeContractWrite } from "@/lib/contracts/tx"
import type {
  ContractActionResult,
  ContractAddress,
  ContractExecutionOptions,
} from "@/lib/contracts/types"

export type CreateOrderInput = {
  agentId: bigint
  serviceId: bigint
  amount: bigint
  contractAddress?: ContractAddress
}

export type MarkOrderInProgressInput = {
  orderId: bigint
  contractAddress?: ContractAddress
}

export type MarkDeliveredInput = {
  orderId: bigint
  deliveryRef: string
  contractAddress?: ContractAddress
}

export type ConfirmCompletionInput = {
  orderId: bigint
  contractAddress?: ContractAddress
}

type EscrowMutationData = {
  contractAddress: ContractAddress
}

export type CreateOrderResult = EscrowMutationData & {
  orderId: bigint | null
  agentId: bigint
  serviceId: bigint
}

function normalizeText(value: string) {
  return value.trim()
}

export async function createOrderWithPayment(
  input: CreateOrderInput,
  options?: ContractExecutionOptions,
): Promise<ContractActionResult<CreateOrderResult>> {
  if (input.amount <= 0n) {
    return createValidationFailure(
      "Order payment amount must be greater than zero before checkout.",
    )
  }

  const contractAddress =
    input.contractAddress ?? agentCommerceConfig.contracts.serviceEscrow

  return executeContractWrite({
    ...options,
    abi: serviceEscrowAbi,
    address: contractAddress,
    functionName: "createOrder",
    args: [input.agentId, input.serviceId],
    value: input.amount,
    parseResult: (receipt) => ({
      orderId: getPrimaryIndexedIdFromReceipt({
        receipt,
        contractAddress,
      }),
      agentId: input.agentId,
      serviceId: input.serviceId,
      contractAddress,
    }),
  })
}

export async function markOrderInProgress(
  input: MarkOrderInProgressInput,
  options?: ContractExecutionOptions,
): Promise<ContractActionResult<EscrowMutationData>> {
  const contractAddress =
    input.contractAddress ?? agentCommerceConfig.contracts.serviceEscrow

  return executeContractWrite({
    ...options,
    abi: serviceEscrowAbi,
    address: contractAddress,
    functionName: "markInProgress",
    args: [input.orderId],
    parseResult: () => ({
      contractAddress,
    }),
  })
}

export async function markDelivered(
  input: MarkDeliveredInput,
  options?: ContractExecutionOptions,
): Promise<ContractActionResult<EscrowMutationData>> {
  const deliveryRef = normalizeText(input.deliveryRef)

  if (!deliveryRef) {
    return createValidationFailure(
      "Add a delivery link or delivery reference before marking the order delivered.",
    )
  }

  const contractAddress =
    input.contractAddress ?? agentCommerceConfig.contracts.serviceEscrow

  return executeContractWrite({
    ...options,
    abi: serviceEscrowAbi,
    address: contractAddress,
    functionName: "markDelivered",
    args: [input.orderId, deliveryRef],
    parseResult: () => ({
      contractAddress,
    }),
  })
}

export async function confirmCompletion(
  input: ConfirmCompletionInput,
  options?: ContractExecutionOptions,
): Promise<ContractActionResult<EscrowMutationData>> {
  const contractAddress =
    input.contractAddress ?? agentCommerceConfig.contracts.serviceEscrow

  return executeContractWrite({
    ...options,
    abi: serviceEscrowAbi,
    address: contractAddress,
    functionName: "confirmCompletion",
    args: [input.orderId],
    parseResult: () => ({
      contractAddress,
    }),
  })
}
