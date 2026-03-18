import type { AgentDto, JsonValue } from "@/lib/api/types"

function isRecord(value: JsonValue | null | undefined): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readStringCandidate(record: Record<string, JsonValue>, key: string) {
  const value = record[key]
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null
}

function parseBigIntCandidate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    return BigInt(value)
  } catch {
    return null
  }
}

export function getAgentOnchainReferences(agent: Pick<AgentDto, "metadata" | "contractAddress" | "appchainId">) {
  const metadata = isRecord(agent.metadata) ? agent.metadata : null
  const onchain = metadata && isRecord(metadata.onchain) ? metadata.onchain : null

  return {
    onchainAgentId: parseBigIntCandidate(readStringCandidate(onchain ?? {}, "agentId")),
    contractAddress:
      readStringCandidate(onchain ?? {}, "contractAddress") ?? agent.contractAddress,
    chainId: readStringCandidate(onchain ?? {}, "chainId") ?? agent.appchainId,
  }
}
