export type HttpMethod = "get" | "post" | "put" | "delete";

export type ExpectedOpenApiRoute = {
  path: string;
  methods: HttpMethod[];
  operationIds: Record<HttpMethod, string>;
  protectedMethods?: HttpMethod[];
};

export const EXPECTED_V1_ROUTES: ExpectedOpenApiRoute[] = [
  {
    path: "/api/v1/health",
    methods: ["get"],
    operationIds: {
      get: "getHealth",
      post: "",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/auth/demo-login",
    methods: ["post"],
    operationIds: {
      get: "",
      post: "demoLogin",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/auth/me",
    methods: ["get"],
    protectedMethods: ["get"],
    operationIds: {
      get: "getCurrentUser",
      post: "",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/foods/search",
    methods: ["get"],
    operationIds: {
      get: "searchFoods",
      post: "",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/foods/{fdcId}",
    methods: ["get"],
    operationIds: {
      get: "getFoodById",
      post: "",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/products/barcode/{barcode}",
    methods: ["get"],
    operationIds: {
      get: "lookupProductByBarcode",
      post: "",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/products/search",
    methods: ["get"],
    operationIds: {
      get: "searchProducts",
      post: "",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/menus/calculate",
    methods: ["post"],
    operationIds: {
      get: "",
      post: "calculateMenu",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/menus",
    methods: ["post", "get"],
    protectedMethods: ["post", "get"],
    operationIds: {
      get: "listMenus",
      post: "saveMenu",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/menus/{menuId}",
    methods: ["get", "put", "delete"],
    protectedMethods: ["get", "put", "delete"],
    operationIds: {
      get: "getMenu",
      post: "",
      put: "updateMenu",
      delete: "deleteMenu",
    },
  },
  {
    path: "/api/v1/favorites",
    methods: ["post", "get"],
    protectedMethods: ["post", "get"],
    operationIds: {
      get: "listFavorites",
      post: "saveFavorite",
      put: "",
      delete: "",
    },
  },
  {
    path: "/api/v1/favorites/{favoriteId}",
    methods: ["delete"],
    protectedMethods: ["delete"],
    operationIds: {
      get: "",
      post: "",
      put: "",
      delete: "deleteFavorite",
    },
  },
];

export const FORBIDDEN_V1_PATH_PARTS = ["compare", "recipes", "recipe", "pantry", "exports", "export"];
