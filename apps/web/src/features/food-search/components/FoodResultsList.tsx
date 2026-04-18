import { type FoodItemDto } from "@/shared/api/foods-api";
import { type MealKey } from "../hooks/useFoodSearch";
import { FoodResultCard } from "./FoodResultCard";

type FoodResultsListProps = {
  items: FoodItemDto[];
  defaultMeal: MealKey;
  onAddToMenu: (food: FoodItemDto, meal: MealKey, grams: number) => void;
};

export function FoodResultsList({
  items,
  defaultMeal,
  onAddToMenu,
}: FoodResultsListProps) {
  return (
    <div className="space-y-3">
      {items.map((food) => (
        <FoodResultCard
          key={food.id}
          food={food}
          defaultMeal={defaultMeal}
          onAddToMenu={onAddToMenu}
        />
      ))}
    </div>
  );
}
