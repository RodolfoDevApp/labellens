import type { MenuItemSource, NutritionFacts } from "@labellens/domain";

export type FavoriteDynamoDbItem = {
  PK: string;
  SK: string;
  entityType: "Favorite";
  id: string;
  ownerId: string;
  source: MenuItemSource;
  sourceId: string;
  displayName: string;
  defaultGrams: number;
  nutrition: NutritionFacts;
  createdAt: string;
  updatedAt: string;
};
