import { waitForTransactionReceipt, writeContract } from "@wagmi/core"
import { agentCommerceConfig, wagmiConfig } from "@/lib/appchain/config"
import { normalizeContractError } from "@/lib/contracts/errors"
import {
  createConfigurationFailure,
  createContractFailure,
  createContractSuccess,
} from "@/lib/contracts/results"
import type {
  ContractActionResult,
  ContractAddress,
  ContractExecutionOptions,
  TransactionReceipt,
} from "@/lib/contracts/types"

type ExecuteContractWriteParams<TData> = ContractExecutionOptions & {
  abi: readonly unknown[]
  address: ContractAddress
  functionName: string
  args?: readonly unknown[]
  value?: bigint
  parseResult?: (receipt: TransactionReceipt) => TData
}

export async function executeContractWrite<TData = void>(
  params: ExecuteContractWriteParams<TData>,
): Promise<ContractActionResult<TData>> {
  if (!agentCommerceConfig.status.walletReady) {
    return createConfigurationFailure(
      "Add NEXT_PUBLIC_APPCHAIN_RPC_URL and NEXT_PUBLIC_APPCHAIN_CHAIN_ID before using live wallet transactions.",
      agentCommerceConfig.status.description,
    )
  }

  if (!agentCommerceConfig.status.contractsReady) {
    return createConfigurationFailure(
      "Add NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS and NEXT_PUBLIC_SERVICE_ESCROW_ADDRESS before using live contract actions.",
      agentCommerceConfig.status.description,
    )
  }

  const targetChainId = agentCommerceConfig.appchain.chainId
  let submittedTxHash: `0x${string}` | undefined

  try {
    params.onAwaitingWallet?.()

    const txHash = await writeContract(wagmiConfig, {
      abi: params.abi as never,
      address: params.address,
      functionName: params.functionName as never,
      args: (params.args ?? []) as never,
      value: params.value,
      chainId: targetChainId,
    })
    submittedTxHash = txHash

    params.onSubmitting?.(txHash)
    params.onSubmitted?.(txHash)
    params.onPending?.(txHash)

    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      chainId: targetChainId,
      hash: txHash,
      confirmations: 1,
    }) as TransactionReceipt

    params.onConfirmed?.(txHash, receipt)

    const data = params.parseResult
      ? params.parseResult(receipt)
      : (undefined as TData)

    return createContractSuccess({
      txHash,
      receipt,
      chainId: targetChainId,
      data,
    })
  } catch (error) {
    const normalizedError = normalizeContractError(error)
    params.onFailed?.(normalizedError, submittedTxHash)
    return createContractFailure(normalizedError, submittedTxHash)
  }
}
