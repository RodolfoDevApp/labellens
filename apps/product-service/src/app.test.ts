import { describe, expect, it } from "vitest";
import { createProductServiceApp } from "./app.js";

describe("product-service", () => {
  it("looks up fixture Open Food Facts products by barcode", async () => {
    const app = createProductServiceApp();
    const response = await app.request("/api/v1/products/barcode/3017624010701");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("OPEN_FOOD_FACTS");
    expect(body.product.barcode).toBe("3017624010701");
  });

  it("treats missing barcodes as a useful not-found state", async () => {
    const app = createProductServiceApp();
    const response = await app.request("/api/v1/products/barcode/1234567890123");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("product.not_found");
  });
});
