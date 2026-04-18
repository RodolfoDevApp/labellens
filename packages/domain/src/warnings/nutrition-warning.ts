export type WarningSeverity = "INFO" | "CAUTION";

export type NutritionWarning = {
  code: string;
  severity: WarningSeverity;
  title: string;
  message: string;
  matchedField?: string;
};
