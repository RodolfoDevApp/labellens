import { z } from "zod";

export const sourceSchema = z.enum(["USDA", "OPEN_FOOD_FACTS"]);
export type Source = z.infer<typeof sourceSchema>;
