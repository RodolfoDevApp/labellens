import { calculateMenuTotals, type MenuItem } from "@labellens/domain";
import type { MenuCalculationWarning } from "../types/menu-calculation-warning.js";
import type { MenuCalculationResponse } from "../types/menu-calculation-response.js";

export type CalculateMenuInput = {
  items: MenuItem[];
};

export class CalculateMenuCommand {
  execute(input: CalculateMenuInput): MenuCalculationResponse {
    const totals = calculateMenuTotals(input.items);
    const warnings: MenuCalculationWarning[] = [];

    if (input.items.length === 0) {
      warnings.push({
        code: "menu.empty",
        message: "Menu has no items yet.",
      });
    }

    for (const item of input.items) {
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
}
