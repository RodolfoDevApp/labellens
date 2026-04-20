import type { MenuMeal, MenuTotals } from "@labellens/domain";

export type SavedMenuDynamoDbItem = {
  PK: string;
  SK: string;
  entityType: "SavedMenu";
  id: string;
  ownerId: string;
  name: string;
  date: string;
  meals: MenuMeal[];
  totals: MenuTotals;
  version: number;
  createdAt: string;
  updatedAt: string;
};
