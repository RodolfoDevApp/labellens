import { z } from "zod";

export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  code: z.string(),
  correlationId: z.string(),
  details: z.unknown().optional(),
});

export type ProblemDetailsContract = z.infer<typeof problemDetailsSchema>;
