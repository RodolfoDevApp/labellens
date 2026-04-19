import { calculateMenuTotals, type Menu, type MenuItem, type MenuMeal, type MealType } from "@labellens/domain";

export type SavedMenu = Menu & {
  ownerId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveMenuInput = {
  ownerId: string;
  name?: string;
  date?: string;
  meals: MenuMeal[];
};

export type UpdateMenuInput = {
  ownerId: string;
  menuId: string;
  name?: string;
  date?: string;
  meals: MenuMeal[];
};

const menusByOwner = new Map<string, SavedMenu[]>();

function flattenItems(meals: MenuMeal[]): MenuItem[] {
  return meals.flatMap((meal) => meal.items);
}

function normalizeDate(date: string | undefined, now: Date): string {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return now.toISOString().slice(0, 10);
}

function fallbackMenuName(date: string, now: Date): string {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const labelDate = Number.isNaN(parsedDate.getTime()) ? now : parsedDate;

  return `Menu for ${labelDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

function normalizeName(name: string | undefined, date: string, now: Date): string {
  const trimmedName = name?.trim();
  return trimmedName && trimmedName.length > 0 ? trimmedName : fallbackMenuName(date, now);
}

function sortMeals(meals: MenuMeal[]): MenuMeal[] {
  const order: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  return order.map((type) => ({
    type,
    items: meals.find((meal) => meal.type === type)?.items ?? [],
  }));
}

export function saveMenu(input: SaveMenuInput): SavedMenu {
  const now = new Date();
  const nowIso = now.toISOString();
  const meals = sortMeals(input.meals);
  const totals = calculateMenuTotals(flattenItems(meals));
  const date = normalizeDate(input.date, now);
  const ownerMenus = menusByOwner.get(input.ownerId) ?? [];
  const menu: SavedMenu = {
    id: `menu_${crypto.randomUUID()}`,
    ownerId: input.ownerId,
    name: normalizeName(input.name, date, now),
    date,
    meals,
    totals,
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  menusByOwner.set(input.ownerId, [menu, ...ownerMenus]);
  return menu;
}

export function updateMenu(input: UpdateMenuInput): SavedMenu | null {
  const ownerMenus = menusByOwner.get(input.ownerId) ?? [];
  const existingMenu = ownerMenus.find((menu) => menu.id === input.menuId);

  if (!existingMenu) {
    return null;
  }

  const now = new Date();
  const meals = sortMeals(input.meals);
  const date = normalizeDate(input.date, now);
  const updatedMenu: SavedMenu = {
    ...existingMenu,
    name: normalizeName(input.name, date, now),
    date,
    meals,
    totals: calculateMenuTotals(flattenItems(meals)),
    version: existingMenu.version + 1,
    updatedAt: now.toISOString(),
  };

  menusByOwner.set(
    input.ownerId,
    ownerMenus.map((menu) => (menu.id === input.menuId ? updatedMenu : menu)),
  );

  return updatedMenu;
}

export function listMenus(ownerId: string): SavedMenu[] {
  return [...(menusByOwner.get(ownerId) ?? [])].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function getMenu(ownerId: string, menuId: string): SavedMenu | null {
  return menusByOwner.get(ownerId)?.find((menu) => menu.id === menuId) ?? null;
}

export function clearMenuStoreForTests() {
  menusByOwner.clear();
}

export function deleteMenu(ownerId: string, menuId: string): boolean {
  const ownerMenus = menusByOwner.get(ownerId) ?? [];
  const nextMenus = ownerMenus.filter((menu) => menu.id !== menuId);

  if (nextMenus.length === ownerMenus.length) {
    return false;
  }

  menusByOwner.set(ownerId, nextMenus);
  return true;
}
