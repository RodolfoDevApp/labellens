import type {
  AuthSessionVerifier,
  CalculateMenuCommand,
  DeleteFavoriteCommand,
  DeleteMenuCommand,
  EventPublisher,
  GetMenuQuery,
  ListFavoritesQuery,
  ListMenusQuery,
  SaveFavoriteCommand,
  SaveMenuCommand,
  UpdateMenuCommand,
} from "@labellens/application";

export type AppUseCases = {
  calculateMenu: CalculateMenuCommand;
  deleteFavorite: DeleteFavoriteCommand;
  deleteMenu: DeleteMenuCommand;
  getMenu: GetMenuQuery;
  listFavorites: ListFavoritesQuery;
  listMenus: ListMenusQuery;
  saveFavorite: SaveFavoriteCommand;
  saveMenu: SaveMenuCommand;
  updateMenu: UpdateMenuCommand;
};

export type AppDependencies = {
  authSessionVerifier: AuthSessionVerifier;
  eventPublisher: EventPublisher;
  useCases: AppUseCases;
};
