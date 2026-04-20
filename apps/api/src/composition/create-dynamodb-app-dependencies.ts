import {
  CalculateMenuCommand,
  DeleteFavoriteCommand,
  DeleteMenuCommand,
  GetMenuQuery,
  ListFavoritesQuery,
  ListMenusQuery,
  SaveFavoriteCommand,
  SaveMenuCommand,
  UpdateMenuCommand,
} from "@labellens/application";
import {
  createDynamoDbDocumentClient,
  DynamoDbFavoriteRepository,
  DynamoDbSavedMenuRepository,
  type DynamoDbConnectionConfig,
} from "@labellens/infrastructure";
import { appConfig } from "../config/app-config.js";
import { DevAuthSessionVerifier } from "../infrastructure/auth/dev-auth-session-verifier.js";
import { NoopEventPublisher } from "../infrastructure/events/noop-event-publisher.js";
import type { AppDependencies } from "./app-dependencies.js";

function createConnectionConfig(): DynamoDbConnectionConfig {
  const connectionConfig: DynamoDbConnectionConfig = {
    region: appConfig.awsRegion,
    tableName: appConfig.labelLensTableName,
  };

  if (appConfig.awsEndpointUrl) {
    connectionConfig.endpoint = appConfig.awsEndpointUrl;
  }

  return connectionConfig;
}

export function createDynamoDbAppDependencies(): AppDependencies {
  const documentClient = createDynamoDbDocumentClient(createConnectionConfig());
  const favoriteRepository = new DynamoDbFavoriteRepository(
    documentClient,
    appConfig.labelLensTableName,
  );
  const savedMenuRepository = new DynamoDbSavedMenuRepository(
    documentClient,
    appConfig.labelLensTableName,
  );

  return {
    authSessionVerifier: new DevAuthSessionVerifier(),
    eventPublisher: new NoopEventPublisher(),
    useCases: {
      calculateMenu: new CalculateMenuCommand(),
      deleteFavorite: new DeleteFavoriteCommand(favoriteRepository),
      deleteMenu: new DeleteMenuCommand(savedMenuRepository),
      getMenu: new GetMenuQuery(savedMenuRepository),
      listFavorites: new ListFavoritesQuery(favoriteRepository),
      listMenus: new ListMenusQuery(savedMenuRepository),
      saveFavorite: new SaveFavoriteCommand(favoriteRepository),
      saveMenu: new SaveMenuCommand(savedMenuRepository),
      updateMenu: new UpdateMenuCommand(savedMenuRepository),
    },
  };
}
