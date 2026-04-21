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
  createSqsClient,
  DevAuthSessionVerifier,
  DynamoDbSavedMenuRepository,
  InMemorySavedMenuRepository,
  NoopEventPublisher,
  SafeEventPublisher,
  SqsEventPublisher,
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

  const eventPublisher = config.analyticsQueueUrl
    ? new SafeEventPublisher(
        new SqsEventPublisher(
          createSqsClient(
            config.awsEndpointUrl
              ? { endpoint: config.awsEndpointUrl, region: config.awsRegion }
              : { region: config.awsRegion },
          ),
          {
            "menu.saved.v1": config.analyticsQueueUrl,
          },
        ),
      )
    : new NoopEventPublisher();

  return {
    authSessionVerifier: new DevAuthSessionVerifier(),
    useCases: {
      calculateMenu: new CalculateMenuCommand(),
      deleteMenu: new DeleteMenuCommand(repository),
      getMenu: new GetMenuQuery(repository),
      listMenus: new ListMenusQuery(repository),
      saveMenu: new SaveMenuCommand(repository, eventPublisher),
      updateMenu: new UpdateMenuCommand(repository),
    },
  };
}
