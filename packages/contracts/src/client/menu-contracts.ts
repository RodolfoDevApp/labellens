import type { ParsedMenuCalculationItem } from "../schemas/menu-item-schema.js";
import type { ParsedMenuMeal } from "../schemas/menu-meal-schema.js";
import type { SaveMenuRequestContract } from "../schemas/save-menu-schema.js";
import type { MenuTotalsContract } from "./menu-totals-contract.js";

export type MenuCalculationItemContract = ParsedMenuCalculationItem;
export type SavedMenuMealContract = ParsedMenuMeal;
export type SaveMenuApiRequestContract = SaveMenuRequestContract;

export type MenuCalculationWarningContract = {
  code: string;
  message: string;
  itemId?: string;
};

export type MenuCalculationResponseContract = {
  totals: MenuTotalsContract;
  partialData: boolean;
  warnings: MenuCalculationWarningContract[];
};

export type SavedMenuContract = {
  id: string;
  ownerId: string;
  name: string;
  date: string;
  meals: SavedMenuMealContract[];
  totals: MenuTotalsContract;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveMenuResponseContract = {
  menu: SavedMenuContract;
};

export type SavedMenusResponseContract = {
  items: SavedMenuContract[];
};

export type DeleteMenuResponseContract = {
  deleted: boolean;
};
