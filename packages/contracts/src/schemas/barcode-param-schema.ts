import { z } from "zod";

export const barcodeParamSchema = z.string().regex(/^\d{8,14}$/, "barcode must be 8 to 14 digits");
