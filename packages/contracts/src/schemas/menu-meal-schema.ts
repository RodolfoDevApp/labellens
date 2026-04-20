import { z } from "zod";
import { menuCalculationItemSchema } from "./menu-item-schema.js";

export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export const menuMealSchema = z.object({
  type: mealTypeSchema,
  items: z.array(menuCalculationItemSchema),
});

export type ParsedMenuMeal = z.infer<typeof menuMealSchema>;
