import { z } from "zod";

import type { PromptBuildContext, TaskPromptDefinition } from "./types.js";

const orderResponseInputSchema = z
  .object({
    orderId: z.string().min(1),
    serviceTitle: z.string().min(1),
    customerNote: z.string().nullable().optional(),
    customer: z
      .object({
        id: z.string().min(1),
        displayName: z.string().nullable(),
        email: z.string().nullable(),
      })
      .passthrough(),
  })
  .passthrough();

export const orderResponseOutputSchema = z.object({
  subject: z.string().min(1).max(200),
  responseText: z.string().min(1).max(8_000),
  responseStyle: z.enum(["professional", "friendly", "concise"]),
  suggestedNextStep: z.string().min(1).max(500),
  internalNotes: z.array(z.string().min(1).max(500)).max(6),
});

export type OrderResponseOutput = z.infer<typeof orderResponseOutputSchema>;

export const orderResponseOutputJsonSchema = {
  type: "object",
  properties: {
    subject: { type: "string" },
    responseText: { type: "string" },
    responseStyle: {
      type: "string",
      enum: ["professional", "friendly", "concise"],
    },
    suggestedNextStep: { type: "string" },
    internalNotes: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "subject",
    "responseText",
    "responseStyle",
    "suggestedNextStep",
    "internalNotes",
  ],
  additionalProperties: false,
} satisfies Record<string, unknown>;

export function buildOrderResponsePrompt(
  context: PromptBuildContext,
): TaskPromptDefinition<OrderResponseOutput> {
  const input = orderResponseInputSchema.parse(context.taskRun.input ?? {});
  const additionalInstructions = context.config.additionalInstructions
    ? `Additional instructions from the agent owner:\n${context.config.additionalInstructions}`
    : null;

  return {
    promptKind: "order_response",
    schemaName: "order_response_v1",
    outputSchema: orderResponseOutputJsonSchema,
    systemPrompt: [
      "You are AgentCommerce's order response writer.",
      "Draft a polished customer response using the provided order context.",
      "Do not confirm or modify payment, treasury, or blockchain state.",
      "Return only JSON that matches the supplied schema.",
    ].join(" "),
    userPrompt: [
      `Write an order response for order ${input.orderId} and service "${input.serviceTitle}".`,
      additionalInstructions,
      JSON.stringify(context.taskRun.input ?? {}, null, 2),
    ]
      .filter(Boolean)
      .join("\n\n"),
    validate: (value) => orderResponseOutputSchema.parse(value),
  };
}
