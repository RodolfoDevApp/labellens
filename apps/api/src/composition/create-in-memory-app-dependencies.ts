import {
  CalculateMenuCommand,
  DeleteFavoriteCommand,
  DeleteMenuCommand,
  GetMenuQuery,
  ListFavoritesQuery,
  ListMenusQuery,
  SaveFavoriteCommand,
  SaveMenuCommand,
  UpdateMenuCommand,
} from "@labellens/application";
import { DevAuthSessionVerifier } from "../infrastructure/auth/dev-auth-session-verifier.js";
import { NoopEventPublisher } from "../infrastructure/events/noop-event-publisher.js";
import { InMemoryFavoriteRepository } from "../infrastructure/in-memory/favorites/in-memory-favorite-repository.js";
import { InMemorySavedMenuRepository } from "../infrastructure/in-memory/menus/in-memory-saved-menu-repository.js";
import type { AppDependencies } from "./app-dependencies.js";

export function createInMemoryAppDependencies(): AppDependencies {
  const favoriteRepository = new InMemoryFavoriteRepository();
  const savedMenuRepository = new InMemorySavedMenuRepository();

  return {
    authSessionVerifier: new DevAuthSessionVerifier(),
    eventPublisher: new NoopEventPublisher(),
    useCases: {
      calculateMenu: new CalculateMenuCommand(),
      deleteFavorite: new DeleteFavoriteCommand(favoriteRepository),
      deleteMenu: new DeleteMenuCommand(savedMenuRepository),
      getMenu: new GetMenuQuery(savedMenuRepository),
      listFavorites: new ListFavoritesQuery(favoriteRepository),
      listMenus: new ListMenusQuery(savedMenuRepository),
      saveFavorite: new SaveFavoriteCommand(favoriteRepository),
      saveMenu: new SaveMenuCommand(savedMenuRepository),
      updateMenu: new UpdateMenuCommand(savedMenuRepository),
    },
  };
}
