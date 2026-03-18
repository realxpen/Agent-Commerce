import type { ContractAddress, TransactionReceipt } from "@/lib/contracts/types"

export function getPrimaryIndexedIdFromReceipt(options: {
  receipt: TransactionReceipt
  contractAddress: ContractAddress
}) {
  const expectedAddress = options.contractAddress.toLowerCase()

  for (const log of options.receipt.logs) {
    if (log.address.toLowerCase() !== expectedAddress) {
      continue
    }

    const indexedId = log.topics[1]

    if (indexedId) {
      try {
        return BigInt(indexedId)
      } catch {
        return null
      }
    }
  }

  return null
}
