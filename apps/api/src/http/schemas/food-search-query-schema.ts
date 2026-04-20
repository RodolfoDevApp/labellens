import { z } from "zod";

export const foodSearchQuerySchema = z.object({
  q: z.string().min(2),
  page: z.coerce.number().int().positive().optional().default(1),
});
