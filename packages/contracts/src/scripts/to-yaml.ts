import type { JsonArray, JsonObject, JsonValue } from "../openapi/openapi-types.js";

const isPlainObject = (value: JsonValue): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const needsQuoting = (value: string) =>
  value === "" ||
  value.includes(":") ||
  value.includes("#") ||
  value.includes("{") ||
  value.includes("}") ||
  value.includes("[") ||
  value.includes("]") ||
  value.includes(",") ||
  value.includes("*") ||
  value.includes("&") ||
  value.includes("?") ||
  value.includes("|") ||
  value.includes(">") ||
  value.includes("!") ||
  value.includes("%") ||
  value.includes("@") ||
  value.includes("`") ||
  value.startsWith("-") ||
  value.startsWith(" ") ||
  value.endsWith(" ") ||
  ["true", "false", "null", "yes", "no", "on", "off"].includes(value.toLowerCase());

const scalarToYaml = (value: string | number | boolean | null) => {
  if (value === null) {
    return "null";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (needsQuoting(value)) {
    return JSON.stringify(value);
  }

  return value;
};

const valueToInlineYaml = (value: JsonValue) => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return scalarToYaml(value);
  }

  return JSON.stringify(value);
};

const indent = (level: number) => "  ".repeat(level);

const arrayToYaml = (values: JsonArray, level: number): string[] => {
  if (values.length === 0) {
    return [`${indent(level)}[]`];
  }

  const lines: string[] = [];

  for (const value of values) {
    if (isPlainObject(value)) {
      lines.push(`${indent(level)}-`);
      lines.push(...objectToYaml(value, level + 1));
      continue;
    }

    if (Array.isArray(value)) {
      lines.push(`${indent(level)}-`);
      lines.push(...arrayToYaml(value, level + 1));
      continue;
    }

    lines.push(`${indent(level)}- ${valueToInlineYaml(value)}`);
  }

  return lines;
};

const objectToYaml = (value: JsonObject, level: number): string[] => {
  const entries = Object.entries(value);

  if (entries.length === 0) {
    return [`${indent(level)}{}`];
  }

  const lines: string[] = [];

  for (const [key, child] of entries) {
    if (isPlainObject(child)) {
      lines.push(`${indent(level)}${key}:`);
      lines.push(...objectToYaml(child, level + 1));
      continue;
    }

    if (Array.isArray(child)) {
      if (child.length === 0) {
        lines.push(`${indent(level)}${key}: []`);
        continue;
      }

      lines.push(`${indent(level)}${key}:`);
      lines.push(...arrayToYaml(child, level + 1));
      continue;
    }

    lines.push(`${indent(level)}${key}: ${valueToInlineYaml(child)}`);
  }

  return lines;
};

export function toYaml(value: JsonObject): string {
  return `${objectToYaml(value, 0).join("\n")}\n`;
}
