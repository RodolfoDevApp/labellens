import type { OpenApiDocument } from "./openapi-types.js";

const problemDetailsRef = { $ref: "#/components/schemas/ProblemDetails" };
const nutritionFactsRef = { $ref: "#/components/schemas/NutritionFacts" };
const menuCalculationItemRef = { $ref: "#/components/schemas/MenuCalculationItem" };
const savedMenuRef = { $ref: "#/components/schemas/SavedMenu" };
const favoriteItemRef = { $ref: "#/components/schemas/FavoriteItem" };

const jsonContent = (schema: object) => ({
  "application/json": {
    schema,
  },
});

const problemResponse = (description: string) => ({
  description,
  content: jsonContent(problemDetailsRef),
});

const bearerAuth = [{ bearerAuth: [] }];

export const openApiDocument: OpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "LabelLens API",
    version: "1.0.0",
    description:
      "Contract for the LabelLens v1 HTTP API. The current scope is food search, barcode lookup, menu calculation, saved menus and favorites. Compare, recipes, pantry inventory and export/PDF are not part of this contract.",
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local gateway/API during development",
    },
  ],
  tags: [
    { name: "health" },
    { name: "auth" },
    { name: "foods" },
    { name: "products" },
    { name: "menus" },
    { name: "favorites" },
  ],
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["health"],
        operationId: "getHealth",
        summary: "Check API health and runtime mode.",
        responses: {
          "200": {
            description: "API is healthy.",
            content: jsonContent({ $ref: "#/components/schemas/HealthResponse" }),
          },
        },
      },
    },
    "/api/v1/auth/demo-login": {
      post: {
        tags: ["auth"],
        operationId: "demoLogin",
        summary: "Create a local-only demo auth token.",
        requestBody: {
          required: false,
          content: jsonContent({ $ref: "#/components/schemas/DemoLoginRequest" }),
        },
        responses: {
          "200": {
            description: "Demo token created.",
            content: jsonContent({ $ref: "#/components/schemas/DemoLoginResponse" }),
          },
          "400": problemResponse("Invalid demo login request."),
        },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["auth"],
        operationId: "getCurrentUser",
        summary: "Return the authenticated user.",
        security: bearerAuth,
        responses: {
          "200": {
            description: "Authenticated user.",
            content: jsonContent({
              type: "object",
              required: ["user"],
              properties: {
                user: { $ref: "#/components/schemas/AuthUser" },
              },
            }),
          },
          "401": problemResponse("Authentication is required."),
        },
      },
    },
    "/api/v1/foods/search": {
      get: {
        tags: ["foods"],
        operationId: "searchFoods",
        summary: "Search USDA foods.",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 2 },
          },
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
        ],
        responses: {
          "200": {
            description: "USDA food search results.",
            content: jsonContent({ $ref: "#/components/schemas/FoodSearchResponse" }),
          },
          "400": problemResponse("Invalid food search query."),
          "503": problemResponse("USDA provider unavailable."),
        },
      },
    },
    "/api/v1/foods/{fdcId}": {
      get: {
        tags: ["foods"],
        operationId: "getFoodById",
        summary: "Get USDA food detail.",
        parameters: [
          {
            name: "fdcId",
            in: "path",
            required: true,
            schema: { type: "string", minLength: 1 },
          },
        ],
        responses: {
          "200": {
            description: "USDA food detail.",
            content: jsonContent({ $ref: "#/components/schemas/FoodDetailResponse" }),
          },
          "400": problemResponse("Invalid food id."),
          "404": problemResponse("Food not found."),
          "503": problemResponse("USDA provider unavailable."),
        },
      },
    },
    "/api/v1/products/barcode/{barcode}": {
      get: {
        tags: ["products"],
        operationId: "lookupProductByBarcode",
        summary: "Look up an Open Food Facts product by barcode.",
        parameters: [
          {
            name: "barcode",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^\\d{8,14}$" },
          },
        ],
        responses: {
          "200": {
            description: "Product found.",
            content: jsonContent({ $ref: "#/components/schemas/ProductLookupResponse" }),
          },
          "400": problemResponse("Invalid barcode."),
          "404": problemResponse("Product not found."),
          "503": problemResponse("Open Food Facts unavailable."),
        },
      },
    },
    "/api/v1/products/search": {
      get: {
        tags: ["products"],
        operationId: "searchProducts",
        summary: "Search products. Fixture-only/reserved in the current API.",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 2 },
          },
        ],
        responses: {
          "200": {
            description: "Product search results.",
            content: jsonContent({ $ref: "#/components/schemas/ProductSearchResponse" }),
          },
          "400": problemResponse("Invalid product search query."),
        },
      },
    },
    "/api/v1/menus/calculate": {
      post: {
        tags: ["menus"],
        operationId: "calculateMenu",
        summary: "Calculate menu totals from grams and normalized nutrition facts.",
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/MenuCalculationRequest" }),
        },
        responses: {
          "200": {
            description: "Calculated menu totals.",
            content: jsonContent({ $ref: "#/components/schemas/MenuCalculationResponse" }),
          },
          "400": problemResponse("Invalid menu calculation request."),
          "422": problemResponse("Menu calculation failed."),
        },
      },
    },
    "/api/v1/menus": {
      post: {
        tags: ["menus"],
        operationId: "saveMenu",
        summary: "Save a personal menu.",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/SaveMenuRequest" }),
        },
        responses: {
          "201": {
            description: "Menu saved.",
            content: jsonContent({
              type: "object",
              required: ["menu"],
              properties: { menu: savedMenuRef },
            }),
          },
          "400": problemResponse("Invalid saved menu request."),
          "401": problemResponse("Authentication is required."),
        },
      },
      get: {
        tags: ["menus"],
        operationId: "listMenus",
        summary: "List personal saved menus.",
        security: bearerAuth,
        responses: {
          "200": {
            description: "Saved menus.",
            content: jsonContent({
              type: "object",
              required: ["items"],
              properties: { items: { type: "array", items: savedMenuRef } },
            }),
          },
          "401": problemResponse("Authentication is required."),
        },
      },
    },
    "/api/v1/menus/{menuId}": {
      get: {
        tags: ["menus"],
        operationId: "getMenu",
        summary: "Get one personal saved menu.",
        security: bearerAuth,
        parameters: [
          { name: "menuId", in: "path", required: true, schema: { type: "string", minLength: 1 } },
        ],
        responses: {
          "200": {
            description: "Saved menu.",
            content: jsonContent({
              type: "object",
              required: ["menu"],
              properties: { menu: savedMenuRef },
            }),
          },
          "400": problemResponse("Invalid menu id."),
          "401": problemResponse("Authentication is required."),
          "404": problemResponse("Menu not found."),
        },
      },
      put: {
        tags: ["menus"],
        operationId: "updateMenu",
        summary: "Update one personal saved menu.",
        security: bearerAuth,
        parameters: [
          { name: "menuId", in: "path", required: true, schema: { type: "string", minLength: 1 } },
        ],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/SaveMenuRequest" }),
        },
        responses: {
          "200": {
            description: "Updated menu.",
            content: jsonContent({
              type: "object",
              required: ["menu"],
              properties: { menu: savedMenuRef },
            }),
          },
          "400": problemResponse("Invalid menu update request."),
          "401": problemResponse("Authentication is required."),
          "404": problemResponse("Menu not found."),
        },
      },
      delete: {
        tags: ["menus"],
        operationId: "deleteMenu",
        summary: "Delete one personal saved menu.",
        security: bearerAuth,
        parameters: [
          { name: "menuId", in: "path", required: true, schema: { type: "string", minLength: 1 } },
        ],
        responses: {
          "200": {
            description: "Menu deleted.",
            content: jsonContent({ $ref: "#/components/schemas/DeleteResponse" }),
          },
          "400": problemResponse("Invalid menu id."),
          "401": problemResponse("Authentication is required."),
          "404": problemResponse("Menu not found."),
        },
      },
    },
    "/api/v1/favorites": {
      post: {
        tags: ["favorites"],
        operationId: "saveFavorite",
        summary: "Save or update a personal favorite food/product default.",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/FavoriteItemInput" }),
        },
        responses: {
          "201": {
            description: "Favorite saved.",
            content: jsonContent({
              type: "object",
              required: ["item"],
              properties: { item: favoriteItemRef },
            }),
          },
          "400": problemResponse("Invalid favorite request."),
          "401": problemResponse("Authentication is required."),
        },
      },
      get: {
        tags: ["favorites"],
        operationId: "listFavorites",
        summary: "List personal favorites.",
        security: bearerAuth,
        responses: {
          "200": {
            description: "Favorite items.",
            content: jsonContent({
              type: "object",
              required: ["items"],
              properties: { items: { type: "array", items: favoriteItemRef } },
            }),
          },
          "401": problemResponse("Authentication is required."),
        },
      },
    },
    "/api/v1/favorites/{favoriteId}": {
      delete: {
        tags: ["favorites"],
        operationId: "deleteFavorite",
        summary: "Delete a personal favorite.",
        security: bearerAuth,
        parameters: [
          { name: "favoriteId", in: "path", required: true, schema: { type: "string", minLength: 1 } },
        ],
        responses: {
          "200": {
            description: "Favorite deleted.",
            content: jsonContent({ $ref: "#/components/schemas/DeleteResponse" }),
          },
          "400": problemResponse("Invalid favorite id."),
          "401": problemResponse("Authentication is required."),
          "404": problemResponse("Favorite not found."),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "dev-token-local-now-cognito-later",
      },
    },
    schemas: {
      Source: {
        type: "string",
        enum: ["USDA", "OPEN_FOOD_FACTS"],
      },
      NutritionFacts: {
        type: "object",
        required: [
          "energyKcalPer100g",
          "proteinGPer100g",
          "carbsGPer100g",
          "fatGPer100g",
          "source",
          "sourceId",
          "lastFetchedAt",
          "completeness",
        ],
        properties: {
          energyKcalPer100g: { type: ["number", "null"] },
          proteinGPer100g: { type: ["number", "null"] },
          carbsGPer100g: { type: ["number", "null"] },
          fatGPer100g: { type: ["number", "null"] },
          sugarGPer100g: { type: ["number", "null"] },
          fiberGPer100g: { type: ["number", "null"] },
          sodiumMgPer100g: { type: ["number", "null"] },
          source: { $ref: "#/components/schemas/Source" },
          sourceId: { type: "string", minLength: 1 },
          lastFetchedAt: { type: "string", format: "date-time" },
          completeness: { type: "string", enum: ["COMPLETE", "PARTIAL", "LOW"] },
        },
        additionalProperties: false,
      },
      MenuCalculationItem: {
        type: "object",
        required: ["id", "source", "sourceId", "displayName", "grams", "nutrition"],
        properties: {
          id: { type: "string", minLength: 1 },
          source: { $ref: "#/components/schemas/Source" },
          sourceId: { type: "string", minLength: 1 },
          displayName: { type: "string", minLength: 1 },
          grams: { type: "number", exclusiveMinimum: 0, maximum: 10000 },
          nutrition: nutritionFactsRef,
        },
        additionalProperties: false,
      },
      MealType: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner", "snack"],
      },
      MenuMeal: {
        type: "object",
        required: ["type", "items"],
        properties: {
          type: { $ref: "#/components/schemas/MealType" },
          items: { type: "array", items: menuCalculationItemRef },
        },
        additionalProperties: false,
      },
      MenuCalculationRequest: {
        type: "object",
        required: ["items"],
        properties: {
          items: { type: "array", items: menuCalculationItemRef, default: [] },
        },
        additionalProperties: false,
      },
      SaveMenuRequest: {
        type: "object",
        required: ["meals"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 80 },
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          meals: { type: "array", items: { $ref: "#/components/schemas/MenuMeal" }, minItems: 1 },
        },
        additionalProperties: false,
      },
      MenuTotals: {
        type: "object",
        required: ["energyKcal", "proteinG", "carbsG", "fatG"],
        properties: {
          energyKcal: { type: "number" },
          proteinG: { type: "number" },
          carbsG: { type: "number" },
          fatG: { type: "number" },
        },
      },
      MenuCalculationWarning: {
        type: "object",
        required: ["itemId", "message"],
        properties: {
          itemId: { type: "string" },
          message: { type: "string" },
        },
      },
      MenuCalculationResponse: {
        type: "object",
        required: ["totals", "partialData", "warnings"],
        properties: {
          totals: { $ref: "#/components/schemas/MenuTotals" },
          partialData: { type: "boolean" },
          warnings: { type: "array", items: { $ref: "#/components/schemas/MenuCalculationWarning" } },
        },
      },
      SavedMenu: {
        type: "object",
        required: ["menuId", "ownerId", "name", "date", "meals", "totals", "partialData", "createdAt", "updatedAt"],
        properties: {
          menuId: { type: "string" },
          ownerId: { type: "string" },
          name: { type: "string" },
          date: { type: "string" },
          meals: { type: "array", items: { $ref: "#/components/schemas/MenuMeal" } },
          totals: { $ref: "#/components/schemas/MenuTotals" },
          partialData: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      FavoriteItemInput: {
        type: "object",
        required: ["source", "sourceId", "displayName", "grams", "nutrition"],
        properties: {
          source: { $ref: "#/components/schemas/Source" },
          sourceId: { type: "string", minLength: 1 },
          displayName: { type: "string", minLength: 1 },
          grams: { type: "number", exclusiveMinimum: 0, maximum: 10000 },
          nutrition: nutritionFactsRef,
        },
        additionalProperties: false,
      },
      FavoriteItem: {
        type: "object",
        required: ["favoriteId", "ownerId", "source", "sourceId", "displayName", "defaultGrams", "nutrition", "createdAt", "updatedAt"],
        properties: {
          favoriteId: { type: "string" },
          ownerId: { type: "string" },
          source: { $ref: "#/components/schemas/Source" },
          sourceId: { type: "string" },
          displayName: { type: "string" },
          defaultGrams: { type: "number" },
          nutrition: nutritionFactsRef,
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthUser: {
        type: "object",
        required: ["userId", "displayName"],
        properties: {
          userId: { type: "string" },
          displayName: { type: "string" },
        },
      },
      DemoLoginRequest: {
        type: "object",
        properties: {
          displayName: { type: "string", minLength: 1, maxLength: 60 },
        },
        additionalProperties: false,
      },
      DemoLoginResponse: {
        type: "object",
        required: ["tokenType", "accessToken", "user"],
        properties: {
          tokenType: { type: "string", enum: ["Bearer"] },
          accessToken: { type: "string" },
          user: { $ref: "#/components/schemas/AuthUser" },
        },
      },
      HealthResponse: {
        type: "object",
        required: ["status", "service", "sourceMode", "storageDriver"],
        properties: {
          status: { type: "string", enum: ["ok"] },
          service: { type: "string", enum: ["labellens-api"] },
          sourceMode: { type: "string" },
          storageDriver: { type: "string", enum: ["in-memory", "dynamodb"] },
        },
      },
      FoodSearchItem: {
        type: "object",
        required: ["fdcId", "description", "dataType", "source", "sourceId", "nutrition"],
        properties: {
          fdcId: { type: "string" },
          description: { type: "string" },
          dataType: { type: "string" },
          brandOwner: { type: "string" },
          source: { const: "USDA" },
          sourceId: { type: "string" },
          nutrition: nutritionFactsRef,
        },
      },
      FoodSearchResponse: {
        type: "object",
        required: ["items", "source", "page"],
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/FoodSearchItem" } },
          source: { const: "USDA" },
          page: { type: "integer", minimum: 1 },
        },
      },
      FoodDetailResponse: {
        type: "object",
        required: ["food", "nutritionFacts"],
        properties: {
          food: { $ref: "#/components/schemas/FoodSearchItem" },
          nutritionFacts: nutritionFactsRef,
        },
      },
      Product: {
        type: "object",
        required: ["barcode", "name", "source", "sourceId", "nutrition"],
        properties: {
          barcode: { type: "string" },
          name: { type: "string" },
          brand: { type: "string" },
          ingredients: { type: "array", items: { type: "string" } },
          allergens: { type: "array", items: { type: "string" } },
          labels: { type: "array", items: { type: "string" } },
          source: { const: "OPEN_FOOD_FACTS" },
          sourceId: { type: "string" },
          nutrition: nutritionFactsRef,
        },
      },
      ProductLookupResponse: {
        type: "object",
        required: ["product", "nutritionFacts"],
        properties: {
          product: { $ref: "#/components/schemas/Product" },
          nutritionFacts: nutritionFactsRef,
        },
      },
      ProductSearchResponse: {
        type: "object",
        required: ["items", "source"],
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/Product" } },
          source: { const: "OPEN_FOOD_FACTS" },
        },
      },
      DeleteResponse: {
        type: "object",
        required: ["deleted"],
        properties: {
          deleted: { type: "boolean", const: true },
        },
      },
      ProblemDetails: {
        type: "object",
        required: ["type", "title", "status", "detail", "code", "correlationId"],
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          status: { type: "integer" },
          detail: { type: "string" },
          code: { type: "string" },
          correlationId: { type: "string" },
          details: {},
        },
      },
    },
  },
};
