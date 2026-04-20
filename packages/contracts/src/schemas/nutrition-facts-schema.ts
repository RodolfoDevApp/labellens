import { z } from "zod";
import { sourceSchema } from "./source-schema.js";

export const nutritionFactsSchema = z.object({
  energyKcalPer100g: z.number().nullable(),
  proteinGPer100g: z.number().nullable(),
  carbsGPer100g: z.number().nullable(),
  fatGPer100g: z.number().nullable(),
  sugarGPer100g: z.number().nullable().optional(),
  fiberGPer100g: z.number().nullable().optional(),
  sodiumMgPer100g: z.number().nullable().optional(),
  source: sourceSchema,
  sourceId: z.string().min(1),
  lastFetchedAt: z.string().datetime(),
  completeness: z.enum(["COMPLETE", "PARTIAL", "LOW"]),
});

export type NutritionFactsContract = z.infer<typeof nutritionFactsSchema>;
