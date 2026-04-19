import { appConfig } from "../../config/app-config.js";
import type { OpenFoodFactsProductResponse } from "./open-food-facts-normalizer.js";

const OPEN_FOOD_FACTS_BASE_URL = "https://world.openfoodfacts.org";
const PRODUCT_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "image_front_small_url",
  "image_url",
  "ingredients_text",
  "ingredients_text_en",
  "allergens_tags",
  "additives_tags",
  "nova_group",
  "nutrition_grades",
  "nutriscore_grade",
  "nutriments",
].join(",");

export type OpenFoodFactsClient = {
  lookupBarcode: (barcode: string) => Promise<OpenFoodFactsProductResponse>;
};

export function createOpenFoodFactsClient(): OpenFoodFactsClient {
  return {
    async lookupBarcode(barcode: string) {
      const url = new URL(`/api/v2/product/${barcode}`, OPEN_FOOD_FACTS_BASE_URL);
      url.searchParams.set("fields", PRODUCT_FIELDS);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": appConfig.openFoodFactsUserAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`Open Food Facts request failed with status ${response.status}`);
      }

      return response.json() as Promise<OpenFoodFactsProductResponse>;
    },
  };
}
