import type { SavedMenuRepository } from "../../ports/saved-menu-repository.js";

export type DeleteMenuInput = {
  ownerId: string;
  menuId: string;
};

export class DeleteMenuCommand {
  constructor(private readonly savedMenuRepository: SavedMenuRepository) {}

  execute(input: DeleteMenuInput): Promise<boolean> {
    return this.savedMenuRepository.delete(input.ownerId, input.menuId);
  }
}
