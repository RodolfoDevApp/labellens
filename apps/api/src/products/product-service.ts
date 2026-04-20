import type { ProductItem } from "@labellens/domain";
import { appConfig } from "../config/app-config.js";
import { productFixtures } from "../fixtures/product-fixtures.js";
import { normalizeSearchText } from "../shared/food-query-translator.js";
import { createOpenFoodFactsClient } from "./open-food-facts/open-food-facts-client.js";
import { normalizeOpenFoodFactsProduct } from "./open-food-facts/open-food-facts-normalizer.js";
import { productCache } from "./product-cache.js";

export type ProductSourceMode = "fixture" | "live";

export type ProductLookupResponse = {
  product: ProductItem;
  source: "OPEN_FOOD_FACTS";
  sourceMode: ProductSourceMode;
};

export type ProductSearchResponse = {
  items: ProductItem[];
  source: "OPEN_FOOD_FACTS";
  sourceMode: ProductSourceMode;
  queryUsed: string;
};

function normalizeBarcode(barcode: string): string {
  return barcode.replace(/\D/g, "");
}

function toPublicProduct(product: (typeof productFixtures)[number]): ProductItem {
  const { searchAliases: _searchAliases, ...publicProduct } = product;
  return publicProduct;
}

function getFixtureProductByBarcode(barcode: string): ProductItem | null {
  const normalizedBarcode = normalizeBarcode(barcode);
  const fixture = productFixtures.find((product) => product.barcode === normalizedBarcode);

  return fixture ? toPublicProduct(fixture) : null;
}

function searchFixtureProducts(query: string): ProductItem[] {
  const normalizedQuery = normalizeSearchText(query);

  return productFixtures
    .filter((product) => {
      const rawSearchableValues = [
        product.name,
        product.brand ?? "",
        product.barcode,
        ...product.searchAliases,
      ];

      return rawSearchableValues
        .map((value) => normalizeSearchText(value))
        .some((value) => value.includes(normalizedQuery));
    })
    .map(toPublicProduct);
}

export async function lookupProductByBarcode(barcode: string): Promise<ProductLookupResponse | null> {
  const normalizedBarcode = normalizeBarcode(barcode);
  const cachedProduct = await productCache.getBarcode(normalizedBarcode);

  if (cachedProduct) {
    return cachedProduct;
  }

  if (appConfig.openFoodFactsMode !== "live") {
    const fixtureProduct = getFixtureProductByBarcode(normalizedBarcode);

    return fixtureProduct
      ? await productCache.setBarcode(normalizedBarcode, {
          product: fixtureProduct,
          source: "OPEN_FOOD_FACTS",
          sourceMode: "fixture",
        })
      : null;
  }

  const client = createOpenFoodFactsClient();
  const product = normalizeOpenFoodFactsProduct(
    await client.lookupBarcode(normalizedBarcode),
    normalizedBarcode,
  );

  return product
    ? await productCache.setBarcode(normalizedBarcode, {
        product,
        source: "OPEN_FOOD_FACTS",
        sourceMode: "live",
      })
    : null;
}

export async function searchProducts(query: string): Promise<ProductSearchResponse> {
  const trimmed = query.trim();
  const sourceMode: ProductSourceMode = appConfig.openFoodFactsMode === "live" ? "live" : "fixture";

  if (trimmed.length < 2) {
    return {
      items: [],
      source: "OPEN_FOOD_FACTS",
      sourceMode,
      queryUsed: query,
    };
  }

  const cachedProducts = await productCache.getSearch(trimmed);

  if (cachedProducts) {
    return {
      items: cachedProducts,
      source: "OPEN_FOOD_FACTS",
      sourceMode,
      queryUsed: trimmed,
    };
  }

  if (sourceMode !== "live") {
    return {
      items: await productCache.setSearch(trimmed, searchFixtureProducts(trimmed)),
      source: "OPEN_FOOD_FACTS",
      sourceMode,
      queryUsed: trimmed,
    };
  }

  // Search is intentionally fixture-only in T2. Barcode lookup is the live scanner path.
  return {
    items: [],
    source: "OPEN_FOOD_FACTS",
    sourceMode,
    queryUsed: trimmed,
  };
}
