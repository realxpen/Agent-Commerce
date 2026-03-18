import type { TaskRunRecord } from "../../../modules/ai-tasks/ai-tasks.types.js";
import type {
  JsonSchemaObject,
  TaskExecutionConfig,
  TaskPromptKind,
} from "../llm.types.js";

export type PromptBuildContext = {
  taskRun: TaskRunRecord;
  config: TaskExecutionConfig;
};

export type TaskPromptDefinition<TOutput = unknown> = {
  promptKind: TaskPromptKind;
  schemaName: string;
  outputSchema: JsonSchemaObject;
  systemPrompt: string;
  userPrompt: string;
  validate: (value: unknown) => TOutput;
};
