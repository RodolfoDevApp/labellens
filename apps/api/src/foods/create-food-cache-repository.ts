import type { FoodCacheRepository } from "@labellens/application";
import { DynamoDbFoodCacheRepository } from "@labellens/infrastructure";
import { appConfig } from "../config/app-config.js";
import { createApiDynamoDbDocumentClient } from "../infrastructure/dynamodb/create-api-dynamodb-document-client.js";
import { InMemoryFoodCacheRepository } from "./in-memory-food-cache-repository.js";
import type { FoodDetailResponse, FoodSearchResponse } from "./food-service.js";

export function createFoodCacheRepository(): FoodCacheRepository<
  FoodSearchResponse,
  FoodDetailResponse
> {
  if (appConfig.storageDriver === "dynamodb") {
    return new DynamoDbFoodCacheRepository<FoodSearchResponse, FoodDetailResponse>(
      createApiDynamoDbDocumentClient(),
      appConfig.labelLensTableName,
    );
  }

  return new InMemoryFoodCacheRepository();
}
