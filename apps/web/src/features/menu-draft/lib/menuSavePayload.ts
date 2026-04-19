import {
  type MenuCalculationItemDto,
  type SaveMenuRequestDto,
} from "@/shared/api/foods-api";
import {
  mealOptions,
  type MealKey,
  type MenuDraftItem,
} from "../hooks/useMenuDraft";

export type MenuSaveOptions = {
  name?: string;
  date?: string;
};

function itemsByMeal(items: MenuDraftItem[], meal: MealKey): MenuDraftItem[] {
  return items.filter((item) => item.meal === meal);
}

function defaultMenuName(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const labelDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  return `Menu for ${labelDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

export function toMenuCalculationItem(item: MenuDraftItem): MenuCalculationItemDto {
  return {
    id: item.id,
    source: item.food.nutrition.source,
    sourceId: item.food.nutrition.sourceId,
    displayName: item.food.name,
    grams: item.grams,
    nutrition: item.food.nutrition,
  };
}

export function buildSaveMenuPayload(
  items: MenuDraftItem[],
  options: MenuSaveOptions = {},
): SaveMenuRequestDto {
  const date = options.date && /^\d{4}-\d{2}-\d{2}$/.test(options.date)
    ? options.date
    : new Date().toISOString().slice(0, 10);
  const name = options.name?.trim() || defaultMenuName(date);

  return {
    name,
    date,
    meals: mealOptions.map((meal) => ({
      type: meal.key,
      items: itemsByMeal(items, meal.key).map(toMenuCalculationItem),
    })),
  };
}
