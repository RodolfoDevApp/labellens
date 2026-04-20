import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openApiDocument } from "../openapi/openapi-document.js";
import { toYaml } from "./to-yaml.js";

const currentFile = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(currentFile), "../..");
const generatedDir = resolve(packageRoot, "generated");
const jsonPath = resolve(generatedDir, "openapi.json");
const yamlPath = resolve(generatedDir, "openapi.yaml");

await mkdir(generatedDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(openApiDocument, null, 2)}\n`, "utf8");
await writeFile(yamlPath, toYaml(openApiDocument), "utf8");

console.log(`Generated ${jsonPath}`);
console.log(`Generated ${yamlPath}`);
