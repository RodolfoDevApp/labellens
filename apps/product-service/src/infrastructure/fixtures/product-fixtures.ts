import type { ProductItem } from "@labellens/domain";

export type ProductFixture = ProductItem & {
  searchAliases: string[];
};

export const productFixtures: ProductFixture[] = [
  {
    barcode: "3017624010701",
    name: "Nutella",
    brand: "Ferrero",
    imageUrl: null,
    ingredientsText:
      "Sugar, palm oil, hazelnuts, skimmed milk powder, fat-reduced cocoa, emulsifier, vanillin.",
    allergens: ["milk", "nuts"],
    additives: ["emulsifier"],
    novaGroup: 4,
    nutriScore: "e",
    searchAliases: ["nutella", "ferrero", "hazelnut spread", "chocolate spread"],
    nutrition: {
      energyKcalPer100g: 539,
      proteinGPer100g: 6.3,
      carbsGPer100g: 57.5,
      fatGPer100g: 30.9,
      sugarGPer100g: 56.3,
      fiberGPer100g: null,
      sodiumMgPer100g: 42,
      source: "OPEN_FOOD_FACTS",
      sourceId: "3017624010701",
      lastFetchedAt: "2026-04-18T00:00:00.000Z",
      completeness: "PARTIAL",
    },
  },
  {
    barcode: "5449000000996",
    name: "Coca-Cola Original Taste",
    brand: "Coca-Cola",
    imageUrl: null,
    ingredientsText:
      "Carbonated water, sugar, colour caramel E150d, phosphoric acid, natural flavourings, caffeine.",
    allergens: [],
    additives: ["E150d"],
    novaGroup: 4,
    nutriScore: "e",
    searchAliases: ["coca cola", "coke", "soda", "cola"],
    nutrition: {
      energyKcalPer100g: 42,
      proteinGPer100g: 0,
      carbsGPer100g: 10.6,
      fatGPer100g: 0,
      sugarGPer100g: 10.6,
      fiberGPer100g: 0,
      sodiumMgPer100g: 0,
      source: "OPEN_FOOD_FACTS",
      sourceId: "5449000000996",
      lastFetchedAt: "2026-04-18T00:00:00.000Z",
      completeness: "COMPLETE",
    },
  },
];
