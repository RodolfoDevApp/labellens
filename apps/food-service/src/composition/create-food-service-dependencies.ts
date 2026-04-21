import {
  createDynamoDbDocumentClient,
  createSqsClient,
  DynamoDbFoodCacheRepository,
  InMemoryFoodCacheRepository,
  NoopEventPublisher,
  SafeEventPublisher,
  SqsEventPublisher,
} from "@labellens/infrastructure";
import type { FoodDetailResponse, FoodSearchResponse } from "../application/food-service-responses.js";
import { GetFoodByIdQuery } from "../application/get-food-by-id-query.js";
import { RefreshFoodCacheCommand } from "../application/refresh-food-cache-command.js";
import { SearchFoodsQuery } from "../application/search-foods-query.js";
import { readFoodServiceConfig } from "../config/food-service-config.js";
import { FixtureFoodProvider } from "../infrastructure/fixtures/fixture-food-provider.js";
import { createUsdaClient } from "../infrastructure/usda/usda-client.js";
import { LiveUsdaFoodProvider } from "../infrastructure/usda/live-usda-food-provider.js";
import type { FoodServiceDependencies } from "./food-service-dependencies.js";

export function createFoodServiceDependencies(): FoodServiceDependencies {
  const config = readFoodServiceConfig();
  const provider = config.usdaApiKey
    ? new LiveUsdaFoodProvider(createUsdaClient(config))
    : new FixtureFoodProvider();
  const cache = config.storageDriver === "dynamodb"
    ? new DynamoDbFoodCacheRepository<FoodSearchResponse, FoodDetailResponse>(
        createDynamoDbDocumentClient(
          config.awsEndpointUrl
            ? { endpoint: config.awsEndpointUrl, region: config.awsRegion, tableName: config.labelLensTableName }
            : { region: config.awsRegion, tableName: config.labelLensTableName },
        ),
        config.labelLensTableName,
      )
    : new InMemoryFoodCacheRepository<FoodSearchResponse, FoodDetailResponse>();

  const eventPublisher = config.analyticsQueueUrl
    ? new SafeEventPublisher(
        new SqsEventPublisher(
          createSqsClient(
            config.awsEndpointUrl
              ? { endpoint: config.awsEndpointUrl, region: config.awsRegion }
              : { region: config.awsRegion },
          ),
          {
            "food.searched.v1": config.analyticsQueueUrl,
          },
        ),
      )
    : new NoopEventPublisher();

  return {
    useCases: {
      getFoodById: new GetFoodByIdQuery(cache, provider),
      refreshFoodCache: new RefreshFoodCacheCommand(cache, provider),
      searchFoods: new SearchFoodsQuery(cache, provider, eventPublisher),
    },
  };
}
