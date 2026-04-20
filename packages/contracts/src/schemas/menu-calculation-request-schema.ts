import { z } from "zod";
import { menuCalculationItemSchema } from "./menu-item-schema.js";

export const menuCalculationRequestSchema = z.object({
  items: z.array(menuCalculationItemSchema).default([]),
});

export type MenuCalculationRequestContract = z.infer<typeof menuCalculationRequestSchema>;
