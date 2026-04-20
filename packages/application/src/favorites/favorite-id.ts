import type { MenuItemSource } from "@labellens/domain";

const sourcePrefixes: Record<MenuItemSource, string> = {
  USDA: "favorite_USDA_",
  OPEN_FOOD_FACTS: "favorite_OPEN_FOOD_FACTS_",
};

export type ParsedFavoriteId = {
  source: MenuItemSource;
  sourceId: string;
};

export function createFavoriteId(source: MenuItemSource, sourceId: string): string {
  return `${sourcePrefixes[source]}${sourceId}`;
}

export function parseFavoriteId(favoriteId: string): ParsedFavoriteId | null {
  for (const [source, prefix] of Object.entries(sourcePrefixes) as Array<
    [MenuItemSource, string]
  >) {
    if (favoriteId.startsWith(prefix)) {
      return {
        source,
        sourceId: favoriteId.slice(prefix.length),
      };
    }
  }

  return null;
}
