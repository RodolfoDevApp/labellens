import type { SavedMenu, SavedMenuRepository, UpdateMenuInput } from "../../ports/saved-menu-repository.js";

export class UpdateMenuCommand {
  constructor(private readonly savedMenuRepository: SavedMenuRepository) {}

  execute(input: UpdateMenuInput): Promise<SavedMenu | null> {
    return this.savedMenuRepository.update(input);
  }
}
