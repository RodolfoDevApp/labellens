import { openApiDocument } from "../openapi/openapi-document.js";
import { assertGeneratedOpenApiCurrent } from "./assert-generated-openapi-current.js";
import { assertOpenApiRouteContract } from "./assert-openapi-route-contract.js";

assertOpenApiRouteContract(openApiDocument);
await assertGeneratedOpenApiCurrent();

console.log("OpenAPI contract verified: sealed v1 routes, auth boundaries and generated artifacts are current.");
