import type { SavedMenu, SavedMenuRepository } from "../../ports/saved-menu-repository.js";

export type GetMenuInput = {
  ownerId: string;
  menuId: string;
};

export class GetMenuQuery {
  constructor(private readonly savedMenuRepository: SavedMenuRepository) {}

  execute(input: GetMenuInput): Promise<SavedMenu | null> {
    return this.savedMenuRepository.get(input.ownerId, input.menuId);
  }
}
