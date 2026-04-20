import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { openApiDocument } from "../openapi/openapi-document.js";
import { toYaml } from "./to-yaml.js";

const currentFile = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(currentFile), "../..");
const generatedDir = resolve(packageRoot, "generated");
const jsonPath = resolve(generatedDir, "openapi.json");
const yamlPath = resolve(generatedDir, "openapi.yaml");

const expectedJson = `${JSON.stringify(openApiDocument, null, 2)}\n`;
const expectedYaml = toYaml(openApiDocument);

const normalizeLineEndings = (value: string) => value.replace(/\r\n/g, "\n");

export async function assertGeneratedOpenApiCurrent(): Promise<void> {
  const [actualJson, actualYaml] = await Promise.all([readFile(jsonPath, "utf8"), readFile(yamlPath, "utf8")]);

  if (normalizeLineEndings(actualJson) !== normalizeLineEndings(expectedJson)) {
    throw new Error("Generated openapi.json is stale. Run npm run generate:openapi and commit the generated file.");
  }

  if (normalizeLineEndings(actualYaml) !== normalizeLineEndings(expectedYaml)) {
    throw new Error("Generated openapi.yaml is stale. Run npm run generate:openapi and commit the generated file.");
  }
}
