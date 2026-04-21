import {
  createDynamoDbDocumentClient,
  DynamoDbProductCacheRepository,
  InMemoryProductCacheRepository,
} from "@labellens/infrastructure";
import { LookupProductByBarcodeQuery } from "../application/lookup-product-by-barcode-query.js";
import type { ProductLookupResponse, ProductSearchResponse, ProductSourceMode } from "../application/product-service-responses.js";
import { SearchProductsQuery } from "../application/search-products-query.js";
import { readProductServiceConfig } from "../config/product-service-config.js";
import { FixtureProductProvider } from "../infrastructure/fixtures/fixture-product-provider.js";
import { createOpenFoodFactsClient } from "../infrastructure/open-food-facts/open-food-facts-client.js";
import { LiveOpenFoodFactsProductProvider } from "../infrastructure/open-food-facts/live-open-food-facts-product-provider.js";
import type { ProductServiceDependencies } from "./product-service-dependencies.js";

export function createProductServiceDependencies(): ProductServiceDependencies {
  const config = readProductServiceConfig();
  const sourceMode: ProductSourceMode = config.openFoodFactsMode === "live" ? "live" : "fixture";
  const provider = sourceMode === "live"
    ? new LiveOpenFoodFactsProductProvider(createOpenFoodFactsClient(config))
    : new FixtureProductProvider();
  const cache = config.storageDriver === "dynamodb"
    ? new DynamoDbProductCacheRepository<ProductLookupResponse, ProductSearchResponse>(
        createDynamoDbDocumentClient(
          config.awsEndpointUrl
            ? { endpoint: config.awsEndpointUrl, region: config.awsRegion, tableName: config.labelLensTableName }
            : { region: config.awsRegion, tableName: config.labelLensTableName },
        ),
        config.labelLensTableName,
      )
    : new InMemoryProductCacheRepository<ProductLookupResponse, ProductSearchResponse>();

  return {
    useCases: {
      lookupProductByBarcode: new LookupProductByBarcodeQuery(sourceMode, cache, provider),
      searchProducts: new SearchProductsQuery(sourceMode, cache, provider),
    },
  };
}
