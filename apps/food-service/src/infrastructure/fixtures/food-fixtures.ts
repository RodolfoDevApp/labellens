import type { FoodItem } from "@labellens/domain";

export type FoodFixture = FoodItem & {
  searchAliases: string[];
};

export const foodFixtures: FoodFixture[] = [
  {
    id: "USDA-168874",
    name: "Oats, raw",
    brandName: null,
    dataType: "Foundation",
    servingSize: 100,
    servingSizeUnit: "g",
    searchAliases: ["oats", "oat", "avena", "hojuelas de avena", "avena cruda"],
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
    searchAliases: ["greek yogurt", "yogurt", "yogur", "yogurt griego", "yogur griego"],
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
  },
  {
    id: "USDA-173944",
    name: "Milk, whole, 3.25% milkfat",
    brandName: null,
    dataType: "Survey",
    servingSize: 100,
    servingSizeUnit: "g",
    searchAliases: ["milk", "leche", "leche entera"],
    nutrition: {
      energyKcalPer100g: 61,
      proteinGPer100g: 3.15,
      carbsGPer100g: 4.8,
      fatGPer100g: 3.25,
      sugarGPer100g: 5.05,
      fiberGPer100g: 0,
      sodiumMgPer100g: 43,
      source: "USDA",
      sourceId: "173944",
      lastFetchedAt: "2026-04-18T00:00:00.000Z",
      completeness: "COMPLETE"
    }
  }
];
