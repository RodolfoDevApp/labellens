import { z } from "zod";

export const nutritionFactsSchema = z.object({
  energyKcalPer100g: z.number().nullable(),
  proteinGPer100g: z.number().nullable(),
  carbsGPer100g: z.number().nullable(),
  fatGPer100g: z.number().nullable(),
  sugarGPer100g: z.number().nullable().optional(),
  fiberGPer100g: z.number().nullable().optional(),
  sodiumMgPer100g: z.number().nullable().optional(),
  source: z.enum(["USDA", "OPEN_FOOD_FACTS"]),
  sourceId: z.string().min(1),
  lastFetchedAt: z.string().datetime(),
  completeness: z.enum(["COMPLETE", "PARTIAL", "LOW"]),
});

export type ParsedNutritionFacts = z.infer<typeof nutritionFactsSchema>;
