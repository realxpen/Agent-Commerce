"use client"

import { useMemo } from "react"
import {
  createAgent,
  createService,
  updateAgent,
} from "@/lib/contracts/agent-registry-client"
import { useContractAction } from "@/hooks/contracts/useContractAction"

export function useAgentRegistryActions() {
  const createAgentAction = useContractAction(createAgent)
  const updateAgentAction = useContractAction(updateAgent)
  const createServiceAction = useContractAction(createService)

  return useMemo(
    () => ({
      createAgent: createAgentAction.execute,
      updateAgent: updateAgentAction.execute,
      createService: createServiceAction.execute,
      createAgentAction,
      updateAgentAction,
      createServiceAction,
    }),
    [createAgentAction, createServiceAction, updateAgentAction],
  )
}
