import { MsgCallResponse } from "@initia/initia.proto/minievm/evm/v1/tx"
import type { IndexedTx } from "@cosmjs/stargate"
import { waitForTransactionReceipt, writeContract } from "@wagmi/core"
import { encodeFunctionData, type Abi } from "viem"
import { agentCommerceConfig, wagmiConfig } from "@/lib/appchain/config"
import { normalizeContractError } from "@/lib/contracts/errors"
import {
  createConfigurationFailure,
  createContractFailure,
  createContractSuccess,
} from "@/lib/contracts/results"
import type {
  ContractReceiptLog,
  ContractActionResult,
  ContractAddress,
  ContractExecutionOptions,
  Hex,
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

function normalizeHexValue(value: string | undefined | null): Hex | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return trimmed.toLowerCase() as Hex
  }

  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    return `0x${trimmed.toLowerCase()}` as Hex
  }

  return null
}

function normalizeContractLog(log: {
  address: string
  topics: string[]
  data: string
}): ContractReceiptLog | null {
  const normalizedAddress = normalizeHexValue(log.address)
  if (!normalizedAddress) {
    return null
  }

  const normalizedTopics = log.topics
    .map((topic) => normalizeHexValue(topic))
    .filter((topic): topic is Hex => Boolean(topic))

  return {
    address: normalizedAddress as ContractAddress,
    topics: normalizedTopics,
    data: normalizeHexValue(log.data) ?? ("0x" as Hex),
  }
}

function normalizeContractTxHash(txHash: string): Hex {
  const normalized = normalizeHexValue(txHash)

  if (!normalized) {
    throw new Error("The appchain returned an invalid transaction hash.")
  }

  return normalized
}

function buildReceiptFromAutoSignResult(input: {
  txHash: string
  indexedTx: IndexedTx
}): TransactionReceipt {
  const msgResponse = input.indexedTx.msgResponses.find(
    (response) =>
      response.typeUrl === "/minievm.evm.v1.MsgCallResponse" ||
      response.typeUrl.endsWith(".MsgCallResponse"),
  )

  const decodedResponse = msgResponse
    ? MsgCallResponse.decode(msgResponse.value)
    : null

  const logs =
    decodedResponse?.logs
      .map((log) => normalizeContractLog(log))
      .filter((log): log is ContractReceiptLog => Boolean(log)) ?? []

  return {
    transactionHash: normalizeContractTxHash(input.txHash),
    status: input.indexedTx.code === 0 ? "success" : "reverted",
    logs,
  }
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

    const autoSignMessage = {
      typeUrl: "/minievm.evm.v1.MsgCall",
      value: {
        sender: params.autoSignContext?.senderAddress,
        contractAddr: params.address,
        input: encodeFunctionData({
          abi: params.abi as Abi,
          functionName: params.functionName,
          args: params.args,
        }),
        value: params.value?.toString() ?? "0",
        accessList: [],
        authList: [],
      },
    } as const

    if (
      params.autoSignContext?.enabled &&
      params.autoSignContext.senderAddress
    ) {
      let autoSignTxHash: string | undefined

      try {
        autoSignTxHash = await params.autoSignContext.submitTxSync({
          chainId: params.autoSignContext.chainId,
          messages: [autoSignMessage],
          fee: {
            amount: [
              {
                denom: params.autoSignContext.preferredFeeDenom,
                amount: "0",
              },
            ],
            gas: "0",
          },
          preferredFeeDenom: params.autoSignContext.preferredFeeDenom,
        })
        submittedTxHash = normalizeContractTxHash(autoSignTxHash)

        params.onSubmitting?.(submittedTxHash)
        params.onSubmitted?.(submittedTxHash)
        params.onPending?.(submittedTxHash)

        const indexedTx = await params.autoSignContext.waitForTxConfirmation({
          txHash: autoSignTxHash,
          chainId: params.autoSignContext.chainId,
        })

        if (indexedTx.code !== 0) {
          throw new Error(indexedTx.rawLog || "The appchain rejected this transaction.")
        }

        const receipt = buildReceiptFromAutoSignResult({
          txHash: autoSignTxHash,
          indexedTx,
        })

        params.onConfirmed?.(submittedTxHash, receipt)

        const data = params.parseResult
          ? params.parseResult(receipt)
          : (undefined as TData)

        return createContractSuccess({
          txHash: submittedTxHash,
          receipt,
          chainId: targetChainId,
          data,
        })
      } catch (error) {
        if (autoSignTxHash) {
          throw error
        }
      }
    }

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
