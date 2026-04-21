import type { ProductItem } from "@labellens/domain";
import type { ProductProvider } from "../../application/product-provider.js";
import type { ProductLookupResponse, ProductSearchResponse } from "../../application/product-service-responses.js";
import { normalizeSearchText } from "../query/search-query-normalizer.js";
import { productFixtures } from "./product-fixtures.js";

function toPublicProduct(product: (typeof productFixtures)[number]): ProductItem {
  const { searchAliases: _searchAliases, ...publicProduct } = product;
  return publicProduct;
}

function findProductByBarcode(barcode: string): ProductItem | null {
  const fixture = productFixtures.find((product) => product.barcode === barcode);
  return fixture ? toPublicProduct(fixture) : null;
}

function searchFixtureProducts(query: string): ProductItem[] {
  const normalizedQuery = normalizeSearchText(query);

  return productFixtures
    .filter((product) => {
      const values: string[] = [
        product.name,
        product.brand ?? "",
        product.ingredientsText ?? "",
        ...product.searchAliases,
      ].map(normalizeSearchText);

      return values.some((value) => value.includes(normalizedQuery));
    })
    .map(toPublicProduct);
}

export class FixtureProductProvider implements ProductProvider {
  async lookupProductByBarcode(barcode: string): Promise<ProductLookupResponse | null> {
    const product = findProductByBarcode(barcode);

    return product
      ? {
          product,
          nutritionFacts: product.nutrition,
          source: "OPEN_FOOD_FACTS",
          sourceMode: "fixture",
        }
      : null;
  }

  async searchProducts(query: string): Promise<ProductSearchResponse> {
    return {
      items: searchFixtureProducts(query),
      source: "OPEN_FOOD_FACTS",
      sourceMode: "fixture",
      queryUsed: query,
    };
  }
}
