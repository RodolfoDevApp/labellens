import type { Menu, MenuMeal } from "@labellens/domain";

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

export interface SavedMenuRepository {
  save(input: SaveMenuInput): Promise<SavedMenu>;
  update(input: UpdateMenuInput): Promise<SavedMenu | null>;
  list(ownerId: string): Promise<SavedMenu[]>;
  get(ownerId: string, menuId: string): Promise<SavedMenu | null>;
  delete(ownerId: string, menuId: string): Promise<boolean>;
}
