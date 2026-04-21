export type StorageDriver = "in-memory" | "dynamodb";

export function parseStorageDriver(value: string | undefined): StorageDriver {
  return value === "dynamodb" ? "dynamodb" : "in-memory";
}
