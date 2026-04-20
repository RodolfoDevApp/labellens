import type { MenuItemSource } from "@labellens/domain";

export function userPartitionKey(ownerId: string): string {
  return `USER#${ownerId}`;
}

export function favoriteSortKey(source: MenuItemSource, sourceId: string): string {
  return `FAVORITE#${source}#${sourceId}`;
}

export function favoriteSortKeyPrefix(): string {
  return "FAVORITE#";
}
