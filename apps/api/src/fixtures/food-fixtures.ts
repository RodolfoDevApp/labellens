import type { FoodItem } from "@labellens/domain";

export const foodFixtures: FoodItem[] = [
  {
    id: "USDA-168874",
    name: "Oats, raw",
    brandName: null,
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
      lastFetchedAt: "2026-04-18T00:00:00.000Z",
      completeness: "COMPLETE"
    }
  },
  {
    id: "USDA-170887",
    name: "Greek yogurt, plain, nonfat",
    brandName: null,
    dataType: "Survey",
    servingSize: 100,
    servingSizeUnit: "g",
    nutrition: {
      energyKcalPer100g: 59,
      proteinGPer100g: 10.19,
      carbsGPer100g: 3.6,
      fatGPer100g: 0.39,
      sugarGPer100g: 3.24,
      fiberGPer100g: 0,
      sodiumMgPer100g: 36,
      source: "USDA",
      sourceId: "170887",
      lastFetchedAt: "2026-04-18T00:00:00.000Z",
      completeness: "COMPLETE"
    }
  }
];
