import { z } from "zod";

import { SERVICE_EXECUTION_MODES } from "../../../modules/services/service-execution.js";
import {
  SERVICE_DELIVERABLE_TYPES,
  getServiceDeliverablePromptInstruction,
} from "../../../modules/services/service-deliverables.js";
import { TASK_TOOL_NAMES } from "../llm.types.js";
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
  customerReferences: z
    .array(
      z.object({
        type: z.enum(["image", "video", "audio", "document", "link"]),
        label: z.string().min(1),
        url: z.string().min(1),
        note: z.string().nullable(),
        source: z.enum(["link", "upload"]).nullable().optional(),
        uploadId: z.string().nullable().optional(),
        fileName: z.string().nullable().optional(),
        contentType: z.string().nullable().optional(),
        sizeBytes: z.number().int().nonnegative().nullable().optional(),
        previewText: z.string().nullable().optional(),
      }),
    )
    .max(8)
    .default([]),
  revisionRequests: z
    .array(
      z.object({
        id: z.string().min(1),
        requestedByUserId: z.string().min(1),
        note: z.string().min(1),
        status: z.enum(["OPEN", "ADDRESSING", "ADDRESSED", "FAILED"]),
        requestedAt: z.string().min(1),
        updatedAt: z.string().min(1),
        resolvedAt: z.string().nullable(),
        failureReason: z.string().nullable(),
      }),
    )
    .default([]),
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
    mode: z.enum(SERVICE_EXECUTION_MODES).default("text_delivery"),
    deliverableType: z.enum(SERVICE_DELIVERABLE_TYPES).default("document"),
    ownerReviewRequired: z.boolean().default(false),
    autoDelivery: z.boolean().default(true),
  }),
  toolContext: z
    .object({
      allowedTools: z.array(z.enum(TASK_TOOL_NAMES)).max(8).default([]),
      results: z
        .array(
          z.object({
            toolName: z.enum(TASK_TOOL_NAMES),
            title: z.string().min(1),
            summary: z.string().min(1),
            sourceLabel: z.string().nullable().optional(),
            url: z.string().nullable().optional(),
            excerpt: z.string().nullable().optional(),
            artifactUrl: z.string().nullable().optional(),
          }),
        )
        .max(12)
        .default([]),
      artifacts: z
        .array(
          z.object({
            artifactId: z.string().min(1),
            taskRunId: z.string().min(1),
            orderId: z.string().nullable(),
            title: z.string().min(1),
            fileName: z.string().min(1),
            contentType: z.string().min(1),
            sizeBytes: z.number().int().nonnegative(),
            source: z.enum(["tool", "llm", "delivery_bundle"]),
            toolName: z.string().nullable(),
            url: z.string().min(1),
            createdAt: z.string().min(1),
          }),
        )
        .max(12)
        .default([]),
    })
    .optional(),
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

function buildSparseInputFallbackInstruction(input: {
  serviceTitle: string;
  deliverableType: z.infer<typeof serviceFulfillmentInputSchema>["execution"]["deliverableType"];
}) {
  const serviceTitle = input.serviceTitle.toLowerCase();
  const looksLikeCompetitorResearch =
    serviceTitle.includes("competitor") ||
    serviceTitle.includes("market") ||
    serviceTitle.includes("landscape") ||
    serviceTitle.includes("benchmark");

  if (looksLikeCompetitorResearch) {
    return "If the customer did not name exact competitors, infer a narrow shortlist of plausible comparable competitors or adjacent products from the service title and brief, clearly label them as inferred comparables, and proceed with a provisional comparison instead of stopping.";
  }

  switch (input.deliverableType) {
    case "code":
    case "contract":
      return "If implementation details are sparse, still produce a clean starter implementation with explicit assumptions, TODOs, and safe defaults.";
    case "design":
      return "If visual references are sparse, still produce a strong default concept, articulate the creative direction, and mark subjective assumptions clearly.";
    case "data":
    case "spreadsheet":
      return "If the dataset is partial, still produce a normalized first-pass output, example schema, or planning model using the available fields and explicit assumptions.";
    case "presentation":
      return "If slide materials are sparse, still produce a deck-ready outline with draft headlines, talking points, and narrative flow.";
    case "video":
    case "audio":
      return "If source assets are sparse, still produce a first-pass script, storyboard, or delivery direction that the next revision can refine.";
    default:
      return "If the brief is sparse, still deliver the strongest useful first pass from the available context, with assumptions clearly labeled instead of blocking on more materials.";
  }
}

export function buildServiceFulfillmentPrompt(
  context: PromptBuildContext,
): TaskPromptDefinition<ServiceFulfillmentOutput> {
  const input = serviceFulfillmentInputSchema.parse(context.taskRun.input ?? {});
  const additionalInstructions = context.config.additionalInstructions
    ? `Additional instructions from the agent owner:\n${context.config.additionalInstructions}`
    : null;

  const modeInstructions = (() => {
    switch (input.execution.mode) {
      case "research_with_links":
        return "This service is in research_with_links mode. Prioritize reference-aware analysis, clearly separate known facts from assumptions, and use the provided materials instead of pretending you browsed unseen sources.";
      case "file_generation":
        return "This service is in file_generation mode. Produce export-ready deliverable text and use artifacts to separate primary file sections or structured outputs the owner can hand off directly.";
      case "hybrid_ai_plus_owner_review":
        return "This service is in hybrid_ai_plus_owner_review mode. Produce a polished internal draft for the agent owner to review before it reaches the customer. Keep it high quality, but remember the owner may edit it before delivery.";
      case "text_delivery":
      default:
        return "This service is in text_delivery mode. Produce a customer-ready delivery that can be attached directly if the workflow allows auto-delivery.";
    }
  })();
  const deliverableInstructions = getServiceDeliverablePromptInstruction(
    input.execution.deliverableType,
  );

  return {
    promptKind: "service_fulfillment",
    schemaName: "service_fulfillment_v1",
    outputSchema: serviceFulfillmentOutputJsonSchema,
    systemPrompt: [
      "You are AgentCommerce's service fulfillment engine.",
      "Produce a useful customer-ready deliverable for the purchased service.",
      "Never write, infer, confirm, refund, reconcile, or change payment, chain, treasury, wallet, or session state.",
      "Customer references can include links and uploaded files.",
      "If a reference includes previewText, treat that preview as usable source material, including extracted DOCX text and audio/video transcripts.",
      "If a reference only includes a URL or file metadata without previewText, do not pretend you inspected the full file contents.",
      "Tool outputs are deterministic runtime-generated context from AgentCommerce.",
      "If toolContext is present, use it as grounded support material.",
      "If a tool result or tool artifact is absent, do not imply it existed.",
      "If there is an OPEN or ADDRESSING revision request, update the existing delivery to satisfy the latest revision note.",
      "Do not collapse into a 'data required' or 'cannot proceed' response only because the attachments are sparse.",
      "Always deliver the strongest useful first pass you can from the service title, customer brief, revision context, service metadata, and any grounded tool output that exists.",
      "Use followUpQuestions only to improve the next revision, not as a reason to skip the current delivery.",
      modeInstructions,
      deliverableInstructions,
      buildSparseInputFallbackInstruction({
        serviceTitle: input.serviceTitle,
        deliverableType: input.execution.deliverableType,
      }),
      "Focus only on the purchased service work and the deliverable itself.",
      "Return only JSON that matches the supplied schema.",
    ].join(" "),
    userPrompt: [
      `Fulfill the purchased service "${input.serviceTitle}" for order ${input.orderId}.`,
      "Use the context below. If details are missing, make a safe reasonable assumption, continue with a narrower but still useful result, and mention the assumptions in the summary or customer message.",
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
            customerReferences: input.customerReferences,
            revisionRequests: input.revisionRequests,
            toolContext: input.toolContext ?? null,
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
