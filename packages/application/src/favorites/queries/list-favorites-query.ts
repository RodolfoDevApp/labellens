import type { FavoriteItem, FavoriteRepository } from "../../ports/favorite-repository.js";

export class ListFavoritesQuery {
  constructor(private readonly favoriteRepository: FavoriteRepository) {}

  execute(ownerId: string): Promise<FavoriteItem[]> {
    return this.favoriteRepository.list(ownerId);
  }
}
