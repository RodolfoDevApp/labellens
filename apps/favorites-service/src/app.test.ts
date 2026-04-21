import { describe, expect, it } from "vitest";
import { createDevAccessToken } from "@labellens/infrastructure";
import { createFavoritesServiceApp } from "./app.js";

const authHeader = `Bearer ${createDevAccessToken({ userId: "demo-user", displayName: "Demo user" })}`;

const favoritePayload = {
  source: "USDA",
  sourceId: "168874",
  displayName: "Oats, raw",
  grams: 40,
  nutrition: {
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
  },
};

describe("favorites-service", () => {
  it("saves and lists favorites for the signed-in user", async () => {
    const app = createFavoritesServiceApp();
    const saveResponse = await app.request("/api/v1/favorites", {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(favoritePayload),
    });

    expect(saveResponse.status).toBe(201);

    const listResponse = await app.request("/api/v1/favorites", {
      headers: { Authorization: authHeader },
    });
    const list = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(list.items.length).toBe(1);
  });
});
