import { describe, expect, it } from "vitest";
import { normalizeOpenFoodFactsProduct } from "./open-food-facts-normalizer.js";

describe("normalizeOpenFoodFactsProduct", () => {
  it("maps Open Food Facts nutriments to LabelLens nutrition facts", () => {
    const product = normalizeOpenFoodFactsProduct(
      {
        code: "3017624010701",
        status: 1,
        product: {
          product_name: "Nutella",
          brands: "Ferrero",
          ingredients_text: "Sugar, palm oil, hazelnuts, milk.",
          allergens_tags: ["en:milk", "en:nuts"],
          additives_tags: ["en:emulsifier"],
          nova_group: 4,
          nutrition_grades: "e",
          nutriments: {
            "energy-kcal_100g": 539,
            proteins_100g: 6.3,
            carbohydrates_100g: 57.5,
            fat_100g: 30.9,
            sugars_100g: 56.3,
            sodium_100g: 0.042,
          },
        },
      },
      "3017624010701",
    );

    expect(product).toMatchObject({
      barcode: "3017624010701",
      name: "Nutella",
      brand: "Ferrero",
      allergens: ["milk", "nuts"],
      additives: ["emulsifier"],
      novaGroup: 4,
      nutriScore: "e",
      nutrition: {
        source: "OPEN_FOOD_FACTS",
        sourceId: "3017624010701",
        energyKcalPer100g: 539,
        proteinGPer100g: 6.3,
        carbsGPer100g: 57.5,
        fatGPer100g: 30.9,
        sugarGPer100g: 56.3,
        sodiumMgPer100g: 42,
        completeness: "PARTIAL",
      },
    });
  });

  it("returns null when OFF reports product not found", () => {
    expect(
      normalizeOpenFoodFactsProduct(
        {
          code: "00000000",
          status: 0,
          status_verbose: "product not found",
        },
        "00000000",
      ),
    ).toBeNull();
  });
});
