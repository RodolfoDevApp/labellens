import type {
  AuthSessionVerifier,
  DeleteFavoriteCommand,
  ListFavoritesQuery,
  SaveFavoriteCommand,
} from "@labellens/application";

export type FavoritesServiceUseCases = {
  deleteFavorite: DeleteFavoriteCommand;
  listFavorites: ListFavoritesQuery;
  saveFavorite: SaveFavoriteCommand;
};

export type FavoritesServiceDependencies = {
  authSessionVerifier: AuthSessionVerifier;
  useCases: FavoritesServiceUseCases;
};
