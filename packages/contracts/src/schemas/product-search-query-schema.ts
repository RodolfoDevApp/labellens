import { z } from "zod";

export const productSearchQuerySchema = z.object({
  q: z.string().min(2),
});

export type ProductSearchQueryContract = z.infer<typeof productSearchQuerySchema>;
