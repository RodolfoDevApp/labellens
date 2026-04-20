import type { SavedMenu, SavedMenuRepository, SaveMenuInput } from "../../ports/saved-menu-repository.js";

export class SaveMenuCommand {
  constructor(private readonly savedMenuRepository: SavedMenuRepository) {}

  execute(input: SaveMenuInput): Promise<SavedMenu> {
    return this.savedMenuRepository.save(input);
  }
}
