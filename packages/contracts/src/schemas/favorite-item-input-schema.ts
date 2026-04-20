import { z } from "zod";
import { menuCalculationItemSchema } from "./menu-item-schema.js";

export const favoriteItemInputSchema = menuCalculationItemSchema.pick({
  source: true,
  sourceId: true,
  displayName: true,
  grams: true,
  nutrition: true,
});

export type FavoriteItemInputContract = z.infer<typeof favoriteItemInputSchema>;
