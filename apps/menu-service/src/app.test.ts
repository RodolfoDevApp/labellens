import { describe, expect, it } from "vitest";
import { createDevAccessToken } from "@labellens/infrastructure";
import { createMenuServiceApp } from "./app.js";

const authHeader = `Bearer ${createDevAccessToken({ userId: "demo-user", displayName: "Demo user" })}`;

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

const menuPayload = {
  name: "Breakfast",
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

describe("menu-service", () => {
  it("calculates menu totals", async () => {
    const app = createMenuServiceApp();
    const response = await app.request("/api/v1/menus/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: menuPayload.meals[0].items }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ partialData: false });
  });

  it("saves and lists menus for the signed-in user", async () => {
    const app = createMenuServiceApp();
    const saveResponse = await app.request("/api/v1/menus", {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(menuPayload),
    });

    expect(saveResponse.status).toBe(201);

    const listResponse = await app.request("/api/v1/menus", {
      headers: { Authorization: authHeader },
    });
    const list = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(list.items.length).toBe(1);
  });
});
