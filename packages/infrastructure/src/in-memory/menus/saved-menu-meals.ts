import type { MealType, MenuItem, MenuMeal } from "@labellens/domain";

const mealOrder: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function flattenMenuItems(meals: MenuMeal[]): MenuItem[] {
  return meals.flatMap((meal) => meal.items);
}

export function sortMenuMeals(meals: MenuMeal[]): MenuMeal[] {
  return mealOrder.map((type) => ({
    type,
    items: meals.find((meal) => meal.type === type)?.items ?? [],
  }));
}
