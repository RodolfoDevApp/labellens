import { createMenuSavedEvent } from "../../events/analytics-events.js";
import type { EventPublisher } from "../../ports/event-publisher.js";
import type { SavedMenu, SavedMenuRepository, SaveMenuInput } from "../../ports/saved-menu-repository.js";

export type SaveMenuCommandInput = SaveMenuInput & {
  correlationId: string;
};

export class SaveMenuCommand {
  constructor(
    private readonly savedMenuRepository: SavedMenuRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(input: SaveMenuCommandInput): Promise<SavedMenu> {
    const savedMenu = await this.savedMenuRepository.save(input);

    void this.eventPublisher?.publish(
      createMenuSavedEvent({
        menu: savedMenu,
        correlationId: input.correlationId,
      }),
    );

    return savedMenu;
  }
}
