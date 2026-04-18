export type MacroGoals = {
  energyKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

export type UserProfile = {
  userId: string;
  displayName?: string;
  goals?: MacroGoals;
  avoidIngredients: string[];
  allergens: string[];
  preferredUnits: "metric";
  updatedAt: string;
};
