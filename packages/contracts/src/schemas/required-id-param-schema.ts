import { z } from "zod";

export const requiredIdParamSchema = z.string().min(1);
