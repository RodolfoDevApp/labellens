import { z } from "zod";
import { nutritionFactsSchema } from "./nutrition-facts-schema.js";
import { sourceSchema } from "./source-schema.js";

export const menuCalculationItemSchema = z.object({
  id: z.string().min(1),
  source: sourceSchema,
  sourceId: z.string().min(1),
  displayName: z.string().min(1),
  grams: z.number().positive().max(10000),
  nutrition: nutritionFactsSchema,
});

export type ParsedMenuCalculationItem = z.infer<typeof menuCalculationItemSchema>;
