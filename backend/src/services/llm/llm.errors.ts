export const TASK_EXECUTION_ERROR_CODES = [
  "unsupported_provider",
  "provider_not_configured",
  "provider_request_failed",
  "prompt_build_failed",
  "malformed_output",
] as const;

export type TaskExecutionErrorCode = (typeof TASK_EXECUTION_ERROR_CODES)[number];

export class TaskExecutionError extends Error {
  readonly code: TaskExecutionErrorCode;
  readonly details: unknown;

  constructor(code: TaskExecutionErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "TaskExecutionError";
    this.code = code;
    this.details = details ?? null;
  }
}
