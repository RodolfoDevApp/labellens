import {
  CalculateMenuCommand,
  DeleteMenuCommand,
  GetMenuQuery,
  ListMenusQuery,
  SaveMenuCommand,
  UpdateMenuCommand,
} from "@labellens/application";
import {
  createDynamoDbDocumentClient,
  DevAuthSessionVerifier,
  DynamoDbSavedMenuRepository,
  InMemorySavedMenuRepository,
} from "@labellens/infrastructure";
import { readMenuServiceConfig } from "../config/menu-service-config.js";
import type { MenuServiceDependencies } from "./menu-service-dependencies.js";

export function createMenuServiceDependencies(): MenuServiceDependencies {
  const config = readMenuServiceConfig();
  const repository = config.storageDriver === "dynamodb"
    ? new DynamoDbSavedMenuRepository(
        createDynamoDbDocumentClient(
          config.awsEndpointUrl
            ? { endpoint: config.awsEndpointUrl, region: config.awsRegion, tableName: config.labelLensTableName }
            : { region: config.awsRegion, tableName: config.labelLensTableName },
        ),
        config.labelLensTableName,
      )
    : new InMemorySavedMenuRepository();

  return {
    authSessionVerifier: new DevAuthSessionVerifier(),
    useCases: {
      calculateMenu: new CalculateMenuCommand(),
      deleteMenu: new DeleteMenuCommand(repository),
      getMenu: new GetMenuQuery(repository),
      listMenus: new ListMenusQuery(repository),
      saveMenu: new SaveMenuCommand(repository),
      updateMenu: new UpdateMenuCommand(repository),
    },
  };
}
