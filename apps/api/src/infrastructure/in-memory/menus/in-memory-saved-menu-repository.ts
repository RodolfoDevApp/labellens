import { calculateMenuTotals } from "@labellens/domain";
import type {
  SavedMenu,
  SavedMenuRepository,
  SaveMenuInput,
  UpdateMenuInput,
} from "@labellens/application";
import { normalizeMenuDate, normalizeMenuName } from "./saved-menu-date.js";
import { flattenMenuItems, sortMenuMeals } from "./saved-menu-meals.js";

export class InMemorySavedMenuRepository implements SavedMenuRepository {
  private readonly menusByOwner = new Map<string, SavedMenu[]>();

  async save(input: SaveMenuInput): Promise<SavedMenu> {
    const now = new Date();
    const nowIso = now.toISOString();
    const meals = sortMenuMeals(input.meals);
    const date = normalizeMenuDate(input.date, now);
    const ownerMenus = this.menusByOwner.get(input.ownerId) ?? [];
    const menu: SavedMenu = {
      id: `menu_${crypto.randomUUID()}`,
      ownerId: input.ownerId,
      name: normalizeMenuName(input.name, date, now),
      date,
      meals,
      totals: calculateMenuTotals(flattenMenuItems(meals)),
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.menusByOwner.set(input.ownerId, [menu, ...ownerMenus]);
    return menu;
  }

  async update(input: UpdateMenuInput): Promise<SavedMenu | null> {
    const ownerMenus = this.menusByOwner.get(input.ownerId) ?? [];
    const existingMenu = ownerMenus.find((menu) => menu.id === input.menuId);

    if (!existingMenu) {
      return null;
    }

    const now = new Date();
    const meals = sortMenuMeals(input.meals);
    const date = normalizeMenuDate(input.date, now);
    const updatedMenu: SavedMenu = {
      ...existingMenu,
      name: normalizeMenuName(input.name, date, now),
      date,
      meals,
      totals: calculateMenuTotals(flattenMenuItems(meals)),
      version: existingMenu.version + 1,
      updatedAt: now.toISOString(),
    };

    this.menusByOwner.set(
      input.ownerId,
      ownerMenus.map((menu) => (menu.id === input.menuId ? updatedMenu : menu)),
    );

    return updatedMenu;
  }

  async list(ownerId: string): Promise<SavedMenu[]> {
    return [...(this.menusByOwner.get(ownerId) ?? [])].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async get(ownerId: string, menuId: string): Promise<SavedMenu | null> {
    return this.menusByOwner.get(ownerId)?.find((menu) => menu.id === menuId) ?? null;
  }

  async delete(ownerId: string, menuId: string): Promise<boolean> {
    const ownerMenus = this.menusByOwner.get(ownerId) ?? [];
    const nextMenus = ownerMenus.filter((menu) => menu.id !== menuId);

    if (nextMenus.length === ownerMenus.length) {
      return false;
    }

    this.menusByOwner.set(ownerId, nextMenus);
    return true;
  }
}
