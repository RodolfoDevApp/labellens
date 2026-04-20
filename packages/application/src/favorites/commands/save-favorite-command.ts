import type { FavoriteItem, FavoriteRepository, SaveFavoriteInput } from "../../ports/favorite-repository.js";

export class SaveFavoriteCommand {
  constructor(private readonly favoriteRepository: FavoriteRepository) {}

  execute(input: SaveFavoriteInput): Promise<FavoriteItem> {
    return this.favoriteRepository.save(input);
  }
}
