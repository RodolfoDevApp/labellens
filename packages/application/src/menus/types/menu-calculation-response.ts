import type { MenuTotals } from "@labellens/domain";
import type { MenuCalculationWarning } from "./menu-calculation-warning.js";

export type MenuCalculationResponse = {
  totals: MenuTotals;
  partialData: boolean;
  warnings: MenuCalculationWarning[];
};
