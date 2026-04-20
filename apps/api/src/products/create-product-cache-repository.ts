import type { ProductCacheRepository } from "@labellens/application";
import type { ProductItem } from "@labellens/domain";
import { DynamoDbProductCacheRepository } from "@labellens/infrastructure";
import { appConfig } from "../config/app-config.js";
import { createApiDynamoDbDocumentClient } from "../infrastructure/dynamodb/create-api-dynamodb-document-client.js";
import { InMemoryProductCacheRepository } from "./in-memory-product-cache-repository.js";
import type { ProductLookupResponse } from "./product-service.js";

export function createProductCacheRepository(): ProductCacheRepository<
  ProductLookupResponse,
  ProductItem[]
> {
  if (appConfig.storageDriver === "dynamodb") {
    return new DynamoDbProductCacheRepository<ProductLookupResponse, ProductItem[]>(
      createApiDynamoDbDocumentClient(),
      appConfig.labelLensTableName,
    );
  }

  return new InMemoryProductCacheRepository();
}
