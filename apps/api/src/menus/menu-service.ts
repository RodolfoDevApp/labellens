import { calculateMenuTotals, type MenuItem, type MenuTotals } from "@labellens/domain";

export type MenuCalculationWarning = {
  code: string;
  message: string;
  itemId?: string;
};

export type MenuCalculationResponse = {
  totals: MenuTotals;
  partialData: boolean;
  warnings: MenuCalculationWarning[];
};

export function calculateMenu(items: MenuItem[]): MenuCalculationResponse {
  const totals = calculateMenuTotals(items);
  const warnings: MenuCalculationWarning[] = [];

  if (items.length === 0) {
    warnings.push({
      code: "menu.empty",
      message: "Menu has no items yet.",
    });
  }

  for (const item of items) {
    if (item.nutrition.completeness !== "COMPLETE") {
      warnings.push({
        code: "menu.item.partial_data",
        itemId: item.id,
        message: `${item.displayName} has partial nutrition data from ${item.nutrition.source}.`,
      });
    }
  }

  return {
    totals,
    partialData: totals.partialData,
    warnings,
  };
}
