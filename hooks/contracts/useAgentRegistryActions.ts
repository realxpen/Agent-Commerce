"use client"

import { useMemo } from "react"
import {
  createAgent,
  createService,
  updateAgent,
} from "@/lib/contracts/agent-registry-client"
import { useContractAction } from "@/hooks/contracts/useContractAction"

export function useAgentRegistryActions() {
  const createAgentAction = useContractAction(createAgent, {
    autoSignMode: "disabled",
  })
  const updateAgentAction = useContractAction(updateAgent, {
    autoSignMode: "disabled",
  })
  const createServiceAction = useContractAction(createService, {
    autoSignMode: "disabled",
  })

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
