import { z } from "zod";

import type { PromptBuildContext, TaskPromptDefinition } from "./types.js";

const serviceFulfillmentInputSchema = z.object({
  orderId: z.string().min(1),
  agentId: z.string().min(1),
  customerId: z.string().min(1),
  serviceTitle: z.string().min(1),
  serviceSnapshot: z.record(z.string(), z.unknown()),
  quotedPriceAmount: z.string().min(1),
  finalPaidAmount: z.string().nullable(),
  currency: z.string().nullable(),
  denom: z.string().min(1),
  paymentReference: z.string().nullable(),
  txHash: z.string().nullable(),
  customerNote: z.string().nullable(),
  customer: z.object({
    id: z.string().min(1),
    displayName: z.string().nullable(),
    email: z.string().nullable(),
  }),
  agent: z.object({
    id: z.string().min(1),
    ownerId: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    treasuryAddress: z.string().min(1),
  }),
  service: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
  }),
  execution: z.object({
    attemptNumber: z.number().int().positive(),
    createdAt: z.string().min(1),
  }),
});

const serviceArtifactSchema = z.object({
  kind: z.enum(["text", "markdown", "json"]),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20_000),
});

export const serviceFulfillmentOutputSchema = z.object({
  summary: z.string().min(1).max(5_000),
  deliveryTitle: z.string().min(1).max(200),
  deliveryText: z.string().min(1).max(20_000),
  customerMessage: z.string().min(1).max(5_000),
  artifacts: z.array(serviceArtifactSchema).max(10),
  followUpQuestions: z.array(z.string().min(1).max(500)).max(5),
});

export type ServiceFulfillmentOutput = z.infer<typeof serviceFulfillmentOutputSchema>;

export const serviceFulfillmentOutputJsonSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A concise summary of what was fulfilled for the order.",
    },
    deliveryTitle: {
      type: "string",
      description: "A short title for the delivered work.",
    },
    deliveryText: {
      type: "string",
      description: "The main customer-ready deliverable in text or markdown.",
    },
    customerMessage: {
      type: "string",
      description: "A brief handoff message the frontend can show to the customer.",
    },
    artifacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["text", "markdown", "json"],
          },
          title: {
            type: "string",
          },
          content: {
            type: "string",
          },
        },
        required: ["kind", "title", "content"],
        additionalProperties: false,
      },
    },
    followUpQuestions: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "summary",
    "deliveryTitle",
    "deliveryText",
    "customerMessage",
    "artifacts",
    "followUpQuestions",
  ],
  additionalProperties: false,
} satisfies Record<string, unknown>;

export function buildServiceFulfillmentPrompt(
  context: PromptBuildContext,
): TaskPromptDefinition<ServiceFulfillmentOutput> {
  const input = serviceFulfillmentInputSchema.parse(context.taskRun.input ?? {});
  const additionalInstructions = context.config.additionalInstructions
    ? `Additional instructions from the agent owner:\n${context.config.additionalInstructions}`
    : null;

  return {
    promptKind: "service_fulfillment",
    schemaName: "service_fulfillment_v1",
    outputSchema: serviceFulfillmentOutputJsonSchema,
    systemPrompt: [
      "You are AgentCommerce's service fulfillment engine.",
      "Produce a useful customer-ready deliverable for the purchased service.",
      "Never write, infer, confirm, refund, reconcile, or change payment, chain, treasury, wallet, or session state.",
      "Focus only on the purchased service work and the deliverable itself.",
      "Return only JSON that matches the supplied schema.",
    ].join(" "),
    userPrompt: [
      `Fulfill the purchased service "${input.serviceTitle}" for order ${input.orderId}.`,
      "Use the context below. If details are missing, make a safe reasonable assumption and mention it in the summary or customer message.",
      additionalInstructions,
      JSON.stringify(
        {
          order: {
            id: input.orderId,
            quotedPriceAmount: input.quotedPriceAmount,
            finalPaidAmount: input.finalPaidAmount,
            currency: input.currency,
            denom: input.denom,
            paymentReference: input.paymentReference,
            txHash: input.txHash,
            customerNote: input.customerNote,
          },
          customer: input.customer,
          agent: input.agent,
          service: input.service,
          serviceSnapshot: input.serviceSnapshot,
          execution: input.execution,
        },
        null,
        2,
      ),
    ]
      .filter(Boolean)
      .join("\n\n"),
    validate: (value) => serviceFulfillmentOutputSchema.parse(value),
  };
}
