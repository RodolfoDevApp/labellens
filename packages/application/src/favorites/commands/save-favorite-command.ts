import { createFavoriteSavedEvent } from "../../events/analytics-events.js";
import type { EventPublisher } from "../../ports/event-publisher.js";
import type { FavoriteItem, FavoriteRepository, SaveFavoriteInput } from "../../ports/favorite-repository.js";

export type SaveFavoriteCommandInput = SaveFavoriteInput & {
  correlationId: string;
};

export class SaveFavoriteCommand {
  constructor(
    private readonly favoriteRepository: FavoriteRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(input: SaveFavoriteCommandInput): Promise<FavoriteItem> {
    const favorite = await this.favoriteRepository.save(input);

    void this.eventPublisher?.publish(
      createFavoriteSavedEvent({
        favorite,
        correlationId: input.correlationId,
      }),
    );

    return favorite;
  }
}
