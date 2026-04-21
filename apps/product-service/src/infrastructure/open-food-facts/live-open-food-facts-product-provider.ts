import type { ProductProvider } from "../../application/product-provider.js";
import type { ProductLookupResponse, ProductSearchResponse } from "../../application/product-service-responses.js";
import type { OpenFoodFactsClient } from "./open-food-facts-client.js";
import { normalizeOpenFoodFactsProduct } from "./open-food-facts-normalizer.js";

export class LiveOpenFoodFactsProductProvider implements ProductProvider {
  constructor(private readonly openFoodFactsClient: OpenFoodFactsClient) {}

  async lookupProductByBarcode(barcode: string): Promise<ProductLookupResponse | null> {
    const product = normalizeOpenFoodFactsProduct(
      await this.openFoodFactsClient.lookupBarcode(barcode),
      barcode,
    );

    return product
      ? {
          product,
          nutritionFacts: product.nutrition,
          source: "OPEN_FOOD_FACTS",
          sourceMode: "live",
        }
      : null;
  }

  async searchProducts(query: string): Promise<ProductSearchResponse> {
    return {
      items: [],
      source: "OPEN_FOOD_FACTS",
      sourceMode: "live",
      queryUsed: query,
    };
  }
}
