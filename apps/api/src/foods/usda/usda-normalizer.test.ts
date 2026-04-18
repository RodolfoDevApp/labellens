import { describe, expect, it } from "vitest";
import { normalizeUsdaFood } from "./usda-normalizer.js";
import type { UsdaSearchFood } from "./usda-client.js";

describe("normalizeUsdaFood", () => {
  it("maps USDA nutrient IDs into LabelLens nutrition facts", () => {
    const food = normalizeUsdaFood({
      fdcId: 168874,
      description: "Oats, raw",
      dataType: "Foundation",
      foodNutrients: [
        { nutrientId: 1008, value: 389 },
        { nutrientId: 1003, value: 16.89 },
        { nutrientId: 1005, value: 66.27 },
        { nutrientId: 1004, value: 6.9 },
        { nutrientId: 2000, value: 0.99 },
        { nutrientId: 1079, value: 10.6 },
        { nutrientId: 1093, value: 2 },
      ],
    });

    expect(food).toMatchObject({
      id: "USDA-168874",
      name: "Oats, raw",
      dataType: "Foundation",
      servingSize: 100,
      servingSizeUnit: "g",
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
        completeness: "COMPLETE",
      },
    });
  });

  it("supports USDA detail shape with nested nutrient metadata and amount", () => {
    const food: UsdaSearchFood = {
      fdcId: 2708489,
      description: "Oats, raw",
      foodNutrients: [
        { nutrient: { id: 1008 }, amount: 379 },
        { nutrient: { id: 1003 }, amount: 13.15 },
        { nutrient: { id: 1005 }, amount: 67.7 },
        { nutrient: { id: 1004 }, amount: 6.52 },
      ],
    };

    expect(normalizeUsdaFood(food).nutrition).toMatchObject({
      energyKcalPer100g: 379,
      proteinGPer100g: 13.15,
      carbsGPer100g: 67.7,
      fatGPer100g: 6.52,
      completeness: "COMPLETE",
    });
  });

  it("marks incomplete foods instead of filling missing values", () => {
    const food = normalizeUsdaFood({
      fdcId: 1,
      description: "Partial food",
      foodNutrients: [
        { nutrientId: 1008, value: 50 },
        { nutrientId: 1003, value: 2 },
      ],
    });

    expect(food.nutrition.carbsGPer100g).toBeNull();
    expect(food.nutrition.fatGPer100g).toBeNull();
    expect(food.nutrition.completeness).toBe("PARTIAL");
  });
});
