import { EXPECTED_V1_ROUTES, FORBIDDEN_V1_PATH_PARTS, type HttpMethod } from "../openapi/expected-v1-routes.js";
import type { JsonObject } from "../openapi/openapi-types.js";

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "delete"];

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireObject = (value: unknown, message: string): JsonObject => {
  if (!isObject(value)) {
    throw new Error(message);
  }

  return value;
};

const getPaths = (document: JsonObject): JsonObject => requireObject(document.paths, "OpenAPI document must include a paths object.");

const getOperation = (pathItem: JsonObject, method: HttpMethod, path: string): JsonObject =>
  requireObject(pathItem[method], `OpenAPI route ${method.toUpperCase()} ${path} must be defined.`);

const assertNoUnexpectedMethods = (pathItem: JsonObject, allowedMethods: HttpMethod[], path: string) => {
  const unexpected = Object.keys(pathItem).filter((key) => HTTP_METHODS.includes(key as HttpMethod) && !allowedMethods.includes(key as HttpMethod));

  if (unexpected.length > 0) {
    throw new Error(`OpenAPI route ${path} has unexpected methods: ${unexpected.join(", ")}.`);
  }
};

const assertExpectedSecurity = (operation: JsonObject, protectedRoute: boolean, method: HttpMethod, path: string) => {
  const hasBearerSecurity = Array.isArray(operation.security) && operation.security.some((entry) => isObject(entry) && Array.isArray(entry.bearerAuth));

  if (protectedRoute && !hasBearerSecurity) {
    throw new Error(`OpenAPI route ${method.toUpperCase()} ${path} must declare bearerAuth security.`);
  }

  if (!protectedRoute && hasBearerSecurity) {
    throw new Error(`OpenAPI route ${method.toUpperCase()} ${path} must stay public and must not declare bearerAuth security.`);
  }
};

const assertExpectedOperationId = (operation: JsonObject, expectedOperationId: string, method: HttpMethod, path: string) => {
  if (operation.operationId !== expectedOperationId) {
    throw new Error(
      `OpenAPI route ${method.toUpperCase()} ${path} expected operationId=${expectedOperationId} but got ${String(operation.operationId)}.`,
    );
  }
};

const assertForbiddenPathsAreAbsent = (paths: JsonObject) => {
  const pathNames = Object.keys(paths);
  const forbiddenPaths = pathNames.filter((path) => FORBIDDEN_V1_PATH_PARTS.some((part) => path.toLowerCase().includes(part)));

  if (forbiddenPaths.length > 0) {
    throw new Error(`OpenAPI contract contains out-of-scope paths: ${forbiddenPaths.join(", ")}.`);
  }
};

export function assertOpenApiRouteContract(document: JsonObject): void {
  const paths = getPaths(document);
  const expectedPathNames = EXPECTED_V1_ROUTES.map((route) => route.path).sort();
  const actualPathNames = Object.keys(paths).sort();

  if (JSON.stringify(actualPathNames) !== JSON.stringify(expectedPathNames)) {
    throw new Error(
      `OpenAPI paths are not sealed. Expected ${expectedPathNames.join(", ")} but got ${actualPathNames.join(", ")}.`,
    );
  }

  assertForbiddenPathsAreAbsent(paths);

  for (const route of EXPECTED_V1_ROUTES) {
    const pathItem = requireObject(paths[route.path], `OpenAPI route ${route.path} must exist.`);
    assertNoUnexpectedMethods(pathItem, route.methods, route.path);

    for (const method of route.methods) {
      const operation = getOperation(pathItem, method, route.path);
      const expectedOperationId = route.operationIds[method];
      const isProtected = route.protectedMethods?.includes(method) ?? false;

      assertExpectedOperationId(operation, expectedOperationId, method, route.path);
      assertExpectedSecurity(operation, isProtected, method, route.path);
    }
  }
}
