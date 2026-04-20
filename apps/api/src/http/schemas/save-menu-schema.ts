import { z } from "zod";
import { menuMealSchema } from "./menu-meal-schema.js";

export const saveMenuSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  meals: z.array(menuMealSchema).min(1),
});
