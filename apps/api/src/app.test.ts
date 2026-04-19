import { describe, expect, it } from "vitest";
import { app } from "./app.js";

const nutrition = {
  energyKcalPer100g: 389,
  proteinGPer100g: 16.89,
  carbsGPer100g: 66.27,
  fatGPer100g: 6.9,
  sugarGPer100g: 0.99,
  fiberGPer100g: 10.6,
  sodiumMgPer100g: 2,
  source: "USDA",
  sourceId: "168874",
  lastFetchedAt: "2026-04-18T00:00:00.000Z",
  completeness: "COMPLETE",
};

describe("LabelLens API", () => {
  it("searches fixture USDA foods without a login", async () => {
    const response = await app.request("/api/v1/foods/search?q=oats");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      source: "USDA",
      sourceMode: "fixture",
      page: 1,
    });
    expect(body.items[0]).toMatchObject({
      name: "Oats, raw",
      nutrition: {
        source: "USDA",
        sourceId: "168874",
        completeness: "COMPLETE",
      },
    });
  });

  it("rejects too-short food queries with problem details", async () => {
    const response = await app.request("/api/v1/foods/search?q=o");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: 400,
      code: "foods.search.invalid_query",
    });
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
  });

  it("looks up fixture Open Food Facts products by barcode", async () => {
    const response = await app.request("/api/v1/products/barcode/3017624010701");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      source: "OPEN_FOOD_FACTS",
      sourceMode: "fixture",
      product: {
        barcode: "3017624010701",
        name: "Nutella",
        brand: "Ferrero",
        nutrition: {
          source: "OPEN_FOOD_FACTS",
          sourceId: "3017624010701",
          completeness: "PARTIAL",
        },
      },
    });
  });

  it("treats missing barcodes as useful product.not_found state", async () => {
    const response = await app.request("/api/v1/products/barcode/1234567890123");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      status: 404,
      code: "product.not_found",
    });
  });

  it("calculates menu totals from source data and grams", async () => {
    const response = await app.request("/api/v1/menus/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            id: "item-1",
            source: "USDA",
            sourceId: "168874",
            displayName: "Oats, raw",
            grams: 40,
            nutrition,
          },
        ],
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      partialData: false,
      totals: {
        energyKcal: 155.6,
        proteinG: 6.76,
        carbsG: 26.51,
        fatG: 2.76,
        partialData: false,
      },
      warnings: [],
    });
  });
});
