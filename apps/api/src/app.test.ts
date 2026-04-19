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

function menuPayload() {
  return {
    name: "Breakfast test",
    date: "2026-04-19",
    meals: [
      {
        type: "breakfast",
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
      },
      { type: "lunch", items: [] },
      { type: "dinner", items: [] },
      { type: "snack", items: [] },
    ],
  };
}

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

  it("requires login before saving personal menus", async () => {
    const response = await app.request("/api/v1/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menuPayload()),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      code: "auth.required",
    });
  });

  it("saves, lists and deletes a menu for the signed-in demo user", async () => {
    const loginResponse = await app.request("/api/v1/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Marban" }),
    });
    const loginBody = await loginResponse.json();

    const saveResponse = await app.request("/api/v1/menus", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginBody.accessToken}`,
      },
      body: JSON.stringify(menuPayload()),
    });
    const saveBody = await saveResponse.json();

    expect(saveResponse.status).toBe(201);
    expect(saveBody.menu).toMatchObject({
      ownerId: "demo-user",
      name: "Breakfast test",
      date: "2026-04-19",
      totals: {
        energyKcal: 155.6,
        proteinG: 6.76,
      },
    });

    const updateResponse = await app.request(`/api/v1/menus/${saveBody.menu.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginBody.accessToken}`,
      },
      body: JSON.stringify({
        ...menuPayload(),
        name: "Updated breakfast",
      }),
    });
    const updateBody = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updateBody.menu).toMatchObject({
      id: saveBody.menu.id,
      name: "Updated breakfast",
      version: 2,
    });

    const listResponse = await app.request("/api/v1/menus", {
      headers: {
        Authorization: `Bearer ${loginBody.accessToken}`,
      },
    });
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.items.some((item: { id: string }) => item.id === saveBody.menu.id)).toBe(true);

    const deleteResponse = await app.request(`/api/v1/menus/${saveBody.menu.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${loginBody.accessToken}`,
      },
    });
    const deleteBody = await deleteResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deleteBody).toEqual({ deleted: true });
  });
});
