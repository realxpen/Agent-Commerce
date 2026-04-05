import { z } from "zod";

const trimmedString = z.string().trim();

export const demoFaucetRequestBodySchema = z.object({
  address: trimmedString.min(1).max(128).optional(),
});

export type DemoFaucetRequestBody = z.infer<typeof demoFaucetRequestBodySchema>;
