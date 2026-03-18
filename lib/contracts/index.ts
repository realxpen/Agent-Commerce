export {
  createAgent,
  createService,
  updateAgent,
  type CreateAgentInput,
  type CreateAgentResult,
  type CreateServiceInput,
  type CreateServiceResult,
  type UpdateAgentInput,
} from "@/lib/contracts/agent-registry-client"
export {
  confirmCompletion,
  createOrderWithPayment,
  markDelivered,
  markOrderInProgress,
  type ConfirmCompletionInput,
  type CreateOrderInput,
  type CreateOrderResult,
  type MarkDeliveredInput,
  type MarkOrderInProgressInput,
} from "@/lib/contracts/service-escrow-client"
export {
  createContractFailure,
  createContractSuccess,
  createValidationFailure,
  isContractActionFailure,
  isContractActionSuccess,
} from "@/lib/contracts/results"
export { normalizeContractError } from "@/lib/contracts/errors"
export type {
  ContractActionFailure,
  ContractActionResult,
  ContractActionStatus,
  ContractActionSuccess,
  ContractAddress,
  ContractExecutionOptions,
  NormalizedContractError,
} from "@/lib/contracts/types"
