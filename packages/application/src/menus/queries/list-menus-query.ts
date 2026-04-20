import type { SavedMenu, SavedMenuRepository } from "../../ports/saved-menu-repository.js";

export class ListMenusQuery {
  constructor(private readonly savedMenuRepository: SavedMenuRepository) {}

  execute(ownerId: string): Promise<SavedMenu[]> {
    return this.savedMenuRepository.list(ownerId);
  }
}
