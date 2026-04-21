import {
  DeleteFavoriteCommand,
  ListFavoritesQuery,
  SaveFavoriteCommand,
} from "@labellens/application";
import {
  createDynamoDbDocumentClient,
  DevAuthSessionVerifier,
  DynamoDbFavoriteRepository,
  InMemoryFavoriteRepository,
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

  return {
    authSessionVerifier: new DevAuthSessionVerifier(),
    useCases: {
      deleteFavorite: new DeleteFavoriteCommand(repository),
      listFavorites: new ListFavoritesQuery(repository),
      saveFavorite: new SaveFavoriteCommand(repository),
    },
  };
}
