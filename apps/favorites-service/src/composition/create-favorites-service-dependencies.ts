import {
  DeleteFavoriteCommand,
  ListFavoritesQuery,
  SaveFavoriteCommand,
} from "@labellens/application";
import {
  createDynamoDbDocumentClient,
  createRuntimeAuthSessionVerifier,
  createSqsClient,
  DynamoDbFavoriteRepository,
  InMemoryFavoriteRepository,
  NoopEventPublisher,
  SafeEventPublisher,
  SqsEventPublisher,
} from "@labellens/infrastructure";
import { readFavoritesServiceConfig } from "../config/favorites-service-config.js";
import type { FavoritesServiceDependencies } from "./favorites-service-dependencies.js";

export function createFavoritesServiceDependencies(): FavoritesServiceDependencies {
  const config = readFavoritesServiceConfig();
  const repository = config.storageDriver === "dynamodb"
    ? new DynamoDbFavoriteRepository(
        createDynamoDbDocumentClient(
          config.awsEndpointUrl
            ? { endpoint: config.awsEndpointUrl, region: config.awsRegion, tableName: config.labelLensTableName }
            : { region: config.awsRegion, tableName: config.labelLensTableName },
        ),
        config.labelLensTableName,
      )
    : new InMemoryFavoriteRepository();

  const eventPublisher = config.analyticsQueueUrl
    ? new SafeEventPublisher(
        new SqsEventPublisher(
          createSqsClient(
            config.awsEndpointUrl
              ? { endpoint: config.awsEndpointUrl, region: config.awsRegion }
              : { region: config.awsRegion },
          ),
          {
            "favorite.saved.v1": config.analyticsQueueUrl,
          },
        ),
      )
    : new NoopEventPublisher();

  return {
    authSessionVerifier: createRuntimeAuthSessionVerifier({
      cognitoUserPoolId: config.cognitoUserPoolId,
      cognitoUserPoolClientId: config.cognitoUserPoolClientId,
    }),
    useCases: {
      deleteFavorite: new DeleteFavoriteCommand(repository),
      listFavorites: new ListFavoritesQuery(repository),
      saveFavorite: new SaveFavoriteCommand(repository, eventPublisher),
    },
  };
}
