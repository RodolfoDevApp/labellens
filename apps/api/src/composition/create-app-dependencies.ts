import { appConfig } from "../config/app-config.js";
import type { AppDependencies } from "./app-dependencies.js";
import { createDynamoDbAppDependencies } from "./create-dynamodb-app-dependencies.js";
import { createInMemoryAppDependencies } from "./create-in-memory-app-dependencies.js";

export { createInMemoryAppDependencies } from "./create-in-memory-app-dependencies.js";

export function createAppDependencies(): AppDependencies {
  if (appConfig.storageDriver === "dynamodb") {
    return createDynamoDbAppDependencies();
  }

  return createInMemoryAppDependencies();
}
