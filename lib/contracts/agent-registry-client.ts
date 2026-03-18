import { agentCommerceConfig } from "@/lib/appchain/config"
import { agentRegistryAbi } from "@/lib/contracts/abis/agent-registry"
import { getPrimaryIndexedIdFromReceipt } from "@/lib/contracts/receipts"
import { createValidationFailure } from "@/lib/contracts/results"
import { executeContractWrite } from "@/lib/contracts/tx"
import type {
  ContractActionResult,
  ContractAddress,
  ContractExecutionOptions,
} from "@/lib/contracts/types"

export type CreateAgentInput = {
  name: string
  category: string
  description: string
  treasuryAddress: ContractAddress
  initUsername?: string
  contractAddress?: ContractAddress
}

export type UpdateAgentInput = {
  agentId: bigint
  name: string
  category: string
  description: string
  treasuryAddress: ContractAddress
  initUsername?: string
  contractAddress?: ContractAddress
}

export type CreateServiceInput = {
  agentId: bigint
  title: string
  description: string
  price: bigint
  contractAddress?: ContractAddress
}

type AgentMutationData = {
  contractAddress: ContractAddress
}

export type CreateAgentResult = AgentMutationData & {
  agentId: bigint | null
}

export type CreateServiceResult = AgentMutationData & {
  serviceId: bigint | null
  agentId: bigint
}

function normalizeText(value: string) {
  return value.trim()
}

export async function createAgent(
  input: CreateAgentInput,
  options?: ContractExecutionOptions,
): Promise<ContractActionResult<CreateAgentResult>> {
  const name = normalizeText(input.name)
  const category = normalizeText(input.category)
  const description = normalizeText(input.description)

  if (!name || !category || !description) {
    return createValidationFailure(
      "Agent name, category, and description are required before deployment.",
    )
  }

  const contractAddress =
    input.contractAddress ?? agentCommerceConfig.contracts.agentRegistry

  return executeContractWrite({
    ...options,
    abi: agentRegistryAbi,
    address: contractAddress,
    functionName: "createAgent",
    args: [
      name,
      category,
      description,
      input.treasuryAddress,
      normalizeText(input.initUsername ?? ""),
    ],
    parseResult: (receipt) => ({
      agentId: getPrimaryIndexedIdFromReceipt({
        receipt,
        contractAddress,
      }),
      contractAddress,
    }),
  })
}

export async function updateAgent(
  input: UpdateAgentInput,
  options?: ContractExecutionOptions,
): Promise<ContractActionResult<AgentMutationData>> {
  const name = normalizeText(input.name)
  const category = normalizeText(input.category)
  const description = normalizeText(input.description)

  if (!name || !category || !description) {
    return createValidationFailure(
      "Agent name, category, and description are required before saving.",
    )
  }

  const contractAddress =
    input.contractAddress ?? agentCommerceConfig.contracts.agentRegistry

  return executeContractWrite({
    ...options,
    abi: agentRegistryAbi,
    address: contractAddress,
    functionName: "updateAgent",
    args: [
      input.agentId,
      name,
      category,
      description,
      input.treasuryAddress,
      normalizeText(input.initUsername ?? ""),
    ],
    parseResult: () => ({
      contractAddress,
    }),
  })
}

export async function createService(
  input: CreateServiceInput,
  options?: ContractExecutionOptions,
): Promise<ContractActionResult<CreateServiceResult>> {
  const title = normalizeText(input.title)
  const description = normalizeText(input.description)

  if (!title || !description) {
    return createValidationFailure(
      "Service title and description are required before publishing.",
    )
  }

  if (input.price <= 0n) {
    return createValidationFailure(
      "Service price must be greater than zero for a one-time service.",
    )
  }

  const contractAddress =
    input.contractAddress ?? agentCommerceConfig.contracts.agentRegistry

  return executeContractWrite({
    ...options,
    abi: agentRegistryAbi,
    address: contractAddress,
    functionName: "createService",
    args: [input.agentId, title, description, input.price],
    parseResult: (receipt) => ({
      serviceId: getPrimaryIndexedIdFromReceipt({
        receipt,
        contractAddress,
      }),
      agentId: input.agentId,
      contractAddress,
    }),
  })
}
