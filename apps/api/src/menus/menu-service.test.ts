import { describe, expect, it } from "vitest";
import type { MenuItem, NutritionFacts } from "@labellens/domain";
import { CalculateMenuCommand } from "@labellens/application";

const completeNutrition: NutritionFacts = {
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

function menuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "item-1",
    source: "USDA",
    sourceId: "168874",
    displayName: "Oats, raw",
    grams: 40,
    nutrition: completeNutrition,
    ...overrides,
  };
}

function calculateMenu(items: MenuItem[]) {
  return new CalculateMenuCommand().execute({ items });
}

describe("CalculateMenuCommand", () => {
  it("calculates totals from per-100g source values and item grams", () => {
    const result = calculateMenu([menuItem()]);

    expect(result.totals).toMatchObject({
      energyKcal: 155.6,
      proteinG: 6.76,
      carbsG: 26.51,
      fatG: 2.76,
      sugarG: 0.4,
      fiberG: 4.24,
      sodiumMg: 0.8,
      partialData: false,
    });
    expect(result.warnings).toEqual([]);
  });

  it("marks totals as partial when a source item is incomplete", () => {
    const result = calculateMenu([
      menuItem({
        id: "item-partial",
        displayName: "Unknown food",
        nutrition: {
          ...completeNutrition,
          carbsGPer100g: null,
          completeness: "PARTIAL",
        },
      }),
    ]);

    expect(result.partialData).toBe(true);
    expect(result.totals.partialData).toBe(true);
    expect(result.totals.carbsG).toBeNull();
    expect(result.warnings).toEqual([
      {
        code: "menu.item.partial_data",
        itemId: "item-partial",
        message: "Unknown food has partial nutrition data from USDA.",
      },
    ]);
  });

  it("returns an empty-menu warning without inventing totals", () => {
    const result = calculateMenu([]);

    expect(result.totals).toMatchObject({
      energyKcal: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      partialData: true,
    });
    expect(result.warnings[0]?.code).toBe("menu.empty");
  });
});
