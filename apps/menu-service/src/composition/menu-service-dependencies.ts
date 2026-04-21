import type {
  AuthSessionVerifier,
  CalculateMenuCommand,
  DeleteMenuCommand,
  GetMenuQuery,
  ListMenusQuery,
  SaveMenuCommand,
  UpdateMenuCommand,
} from "@labellens/application";

export type MenuServiceUseCases = {
  calculateMenu: CalculateMenuCommand;
  deleteMenu: DeleteMenuCommand;
  getMenu: GetMenuQuery;
  listMenus: ListMenusQuery;
  saveMenu: SaveMenuCommand;
  updateMenu: UpdateMenuCommand;
};

export type MenuServiceDependencies = {
  authSessionVerifier: AuthSessionVerifier;
  useCases: MenuServiceUseCases;
};
