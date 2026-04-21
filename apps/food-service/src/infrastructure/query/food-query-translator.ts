const spanishToEnglishQueryMap = new Map<string, string>([
  ["avena", "oats"],
  ["yogur", "yogurt"],
  ["yogurt", "yogurt"],
  ["leche", "milk"],
  ["huevo", "egg"],
  ["huevos", "egg"],
  ["pollo", "chicken"],
  ["arroz", "rice"],
  ["platano", "banana"],
  ["plátano", "banana"],
  ["manzana", "apple"],
  ["papa", "potato"],
  ["frijol", "beans"],
  ["frijoles", "beans"]
]);

export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function translateFoodQuery(query: string): string {
  const normalized = normalizeSearchText(query);
  return spanishToEnglishQueryMap.get(normalized) ?? query.trim();
}
