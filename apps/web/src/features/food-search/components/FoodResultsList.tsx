import { type FoodItemDto } from "@/shared/api/foods-api";
import { type MealKey } from "@/features/menu-draft/hooks/useMenuDraft";
import { FoodResultCard } from "./FoodResultCard";

type FoodResultsListProps = {
  items: FoodItemDto[];
  defaultMeal: MealKey;
  onAddToMenu: (food: FoodItemDto, meal: MealKey, grams: number) => void;
  onSaveFavorite: (food: FoodItemDto, grams: number) => void | Promise<void>;
};

export function FoodResultsList({
  items,
  defaultMeal,
  onAddToMenu,
  onSaveFavorite,
}: FoodResultsListProps) {
  return (
    <div className="space-y-3">
      {items.map((food) => (
        <FoodResultCard
          key={food.id}
          food={food}
          defaultMeal={defaultMeal}
          onAddToMenu={onAddToMenu}
          onSaveFavorite={onSaveFavorite}
        />
      ))}
    </div>
  );
}
