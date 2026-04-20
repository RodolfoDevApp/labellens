import type { FavoriteRepository } from "../../ports/favorite-repository.js";

export type DeleteFavoriteInput = {
  ownerId: string;
  favoriteId: string;
};

export class DeleteFavoriteCommand {
  constructor(private readonly favoriteRepository: FavoriteRepository) {}

  execute(input: DeleteFavoriteInput): Promise<boolean> {
    return this.favoriteRepository.delete(input.ownerId, input.favoriteId);
  }
}
