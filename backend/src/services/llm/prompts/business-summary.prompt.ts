import { z } from "zod";

import type { PromptBuildContext, TaskPromptDefinition } from "./types.js";

const businessSummaryInputSchema = z
  .object({
    agent: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
        slug: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

export const businessSummaryOutputSchema = z.object({
  headline: z.string().min(1).max(200),
  summary: z.string().min(1).max(5_000),
  highlights: z.array(z.string().min(1).max(500)).max(8),
  risks: z.array(z.string().min(1).max(500)).max(8),
  nextActions: z.array(z.string().min(1).max(500)).max(8),
});

export type BusinessSummaryOutput = z.infer<typeof businessSummaryOutputSchema>;

export const businessSummaryOutputJsonSchema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    highlights: {
      type: "array",
      items: {
        type: "string",
      },
    },
    risks: {
      type: "array",
      items: {
        type: "string",
      },
    },
    nextActions: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: ["headline", "summary", "highlights", "risks", "nextActions"],
  additionalProperties: false,
} satisfies Record<string, unknown>;

export function buildBusinessSummaryPrompt(
  context: PromptBuildContext,
): TaskPromptDefinition<BusinessSummaryOutput> {
  const input = businessSummaryInputSchema.parse(context.taskRun.input ?? {});
  const additionalInstructions = context.config.additionalInstructions
    ? `Additional instructions from the agent owner:\n${context.config.additionalInstructions}`
    : null;

  return {
    promptKind: "business_summary",
    schemaName: "business_summary_v1",
    outputSchema: businessSummaryOutputJsonSchema,
    systemPrompt: [
      "You are AgentCommerce's business summary generator.",
      "Create a concise business-oriented summary using the provided agent context.",
      "Do not claim to confirm or mutate on-chain balances, payment finality, or treasury state.",
      "Return only JSON that matches the supplied schema.",
    ].join(" "),
    userPrompt: [
      `Generate a business summary for agent ${input.agent.name}.`,
      additionalInstructions,
      JSON.stringify(context.taskRun.input ?? {}, null, 2),
    ]
      .filter(Boolean)
      .join("\n\n"),
    validate: (value) => businessSummaryOutputSchema.parse(value),
  };
}
