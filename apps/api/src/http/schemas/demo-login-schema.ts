import { z } from "zod";

export const demoLoginSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
});
