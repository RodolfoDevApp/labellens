import type { Hono } from "hono";
import { lookupProductByBarcode, searchProducts } from "../../products/product-service.js";
import { problemDetails } from "../../shared/problem-details.js";
import type { AppBindings } from "../app-bindings.js";
import { barcodeParamSchema } from "../schemas/barcode-param-schema.js";
import { productSearchQuerySchema } from "../schemas/product-search-query-schema.js";

export function registerProductRoutes(app: Hono<AppBindings>): void {
  app.get("/api/v1/products/barcode/:barcode", async (c) => {
    const correlationId = c.get("correlationId");
    const parsed = barcodeParamSchema.safeParse(c.req.param("barcode"));

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid barcode",
          status: 400,
          detail: "Barcode must contain 8 to 14 digits.",
          code: "products.barcode.invalid_barcode",
          correlationId,
          details: parsed.error.issues,
        }),
        400,
      );
    }

    try {
      const result = await lookupProductByBarcode(parsed.data);

      if (!result) {
        return c.json(
          problemDetails({
            title: "Product not found",
            status: 404,
            detail: "Open Food Facts does not have a product for that barcode in the current source mode.",
            code: "product.not_found",
            correlationId,
          }),
          404,
        );
      }

      return c.json(result);
    } catch (error) {
      return c.json(
        problemDetails({
          title: "Open Food Facts unavailable",
          status: 503,
          detail: error instanceof Error ? error.message : "Product data provider failed.",
          code: "products.barcode.provider_unavailable",
          correlationId,
        }),
        503,
      );
    }
  });

  app.get("/api/v1/products/search", async (c) => {
    const correlationId = c.get("correlationId");
    const parsed = productSearchQuerySchema.safeParse({
      q: c.req.query("q"),
    });

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid product query",
          status: 400,
          detail: "q must have at least 2 characters.",
          code: "products.search.invalid_query",
          correlationId,
          details: parsed.error.issues,
        }),
        400,
      );
    }

    return c.json(await searchProducts(parsed.data.q));
  });
}
