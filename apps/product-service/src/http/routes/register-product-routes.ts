import type { Hono } from "hono";
import { barcodeParamSchema, productSearchQuerySchema } from "@labellens/contracts";
import { problemDetails, type ServiceBindings } from "@labellens/service-support";
import type { ProductServiceDependencies } from "../../composition/product-service-dependencies.js";

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 50;
  }

  return Math.min(500, Math.floor(value));
}

export function registerProductRoutes(app: Hono<ServiceBindings>, dependencies: ProductServiceDependencies): void {
  app.post("/internal/cache/refresh/product", async (c) => {
    const correlationId = c.get("correlationId");
    const body = await c.req.json().catch(() => ({}));
    const limit = normalizeLimit(typeof body === "object" && body !== null ? (body as { limit?: unknown }).limit : undefined);

    try {
      return c.json({
        correlationId,
        result: await dependencies.useCases.refreshProductCache.execute({ limit }),
      });
    } catch (error) {
      return c.json(
        problemDetails({
          title: "Product cache refresh failed",
          status: 503,
          detail: error instanceof Error ? error.message : "Product cache refresh failed.",
          code: "products.cache_refresh.failed",
          correlationId,
        }),
        503,
      );
    }
  });

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
      const result = await dependencies.useCases.lookupProductByBarcode.execute({
        barcode: parsed.data,
        correlationId,
      });

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

    return c.json(await dependencies.useCases.searchProducts.execute(parsed.data.q));
  });
}
