import { describe, expect, it } from "vitest";
import { createFoodServiceApp } from "./app.js";

describe("food-service", () => {
  it("searches fixture USDA foods", async () => {
    const app = createFoodServiceApp();
    const response = await app.request("/api/v1/foods/search?q=oats");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("USDA");
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("returns fixture USDA detail", async () => {
    const app = createFoodServiceApp();
    const response = await app.request("/api/v1/foods/168874");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.food.nutrition.sourceId).toBe("168874");
  });
});
