import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
import type { MealType, MenuItem, MenuMeal, NutritionFacts } from "@labellens/domain";
import { createDevAccessToken, readDevAuthUser, type AuthUser } from "./auth/dev-auth.js";
import { appConfig } from "./config/app-config.js";
import { getFoodById, searchFoods } from "./foods/food-service.js";
import { calculateMenu } from "./menus/menu-service.js";
import {
  deleteMenu,
  getMenu,
  listMenus,
  saveMenu,
  updateMenu,
  type SaveMenuInput,
  type UpdateMenuInput,
} from "./menus/persistence/menu-store.js";
import { lookupProductByBarcode, searchProducts } from "./products/product-service.js";
import { problemDetails } from "./shared/problem-details.js";

type AppBindings = {
  Variables: {
    correlationId: string;
  };
};

export const app = new Hono<AppBindings>();

const nutritionFactsSchema = z.object({
  energyKcalPer100g: z.number().nullable(),
  proteinGPer100g: z.number().nullable(),
  carbsGPer100g: z.number().nullable(),
  fatGPer100g: z.number().nullable(),
  sugarGPer100g: z.number().nullable().optional(),
  fiberGPer100g: z.number().nullable().optional(),
  sodiumMgPer100g: z.number().nullable().optional(),
  source: z.enum(["USDA", "OPEN_FOOD_FACTS"]),
  sourceId: z.string().min(1),
  lastFetchedAt: z.string().datetime(),
  completeness: z.enum(["COMPLETE", "PARTIAL", "LOW"]),
});

const menuCalculationItemSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["USDA", "OPEN_FOOD_FACTS", "CUSTOM_RECIPE"]),
  sourceId: z.string().min(1),
  displayName: z.string().min(1),
  grams: z.number().positive().max(10000),
  nutrition: nutritionFactsSchema,
});

const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

const menuMealSchema = z.object({
  type: mealTypeSchema,
  items: z.array(menuCalculationItemSchema),
});

const saveMenuSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  meals: z.array(menuMealSchema).min(1),
});

type ParsedNutritionFacts = z.infer<typeof nutritionFactsSchema>;
type ParsedMenuCalculationItem = z.infer<typeof menuCalculationItemSchema>;
type ParsedMenuMeal = z.infer<typeof menuMealSchema>;

function toNutritionFacts(nutrition: ParsedNutritionFacts): NutritionFacts {
  return {
    energyKcalPer100g: nutrition.energyKcalPer100g,
    proteinGPer100g: nutrition.proteinGPer100g,
    carbsGPer100g: nutrition.carbsGPer100g,
    fatGPer100g: nutrition.fatGPer100g,
    sugarGPer100g: nutrition.sugarGPer100g ?? null,
    fiberGPer100g: nutrition.fiberGPer100g ?? null,
    sodiumMgPer100g: nutrition.sodiumMgPer100g ?? null,
    source: nutrition.source,
    sourceId: nutrition.sourceId,
    lastFetchedAt: nutrition.lastFetchedAt,
    completeness: nutrition.completeness,
  };
}

function toMenuItem(item: ParsedMenuCalculationItem): MenuItem {
  return {
    id: item.id,
    source: item.source,
    sourceId: item.sourceId,
    displayName: item.displayName,
    grams: item.grams,
    nutrition: toNutritionFacts(item.nutrition),
  };
}

function toMenuMeal(meal: ParsedMenuMeal): MenuMeal {
  return {
    type: meal.type as MealType,
    items: meal.items.map(toMenuItem),
  };
}

function requireAuthUser(
  authorizationHeader: string | undefined,
  correlationId: string,
): { ok: true; user: AuthUser } | { ok: false; response: Response } {
  const user = readDevAuthUser(authorizationHeader);

  if (!user) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify(
          problemDetails({
            title: "Login required",
            status: 401,
            detail: "Saving and reading personal menus requires a signed-in user.",
            code: "auth.required",
            correlationId,
          }),
        ),
        {
          status: 401,
          headers: { "content-type": "application/problem+json" },
        },
      ),
    };
  }

  return { ok: true, user };
}

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-correlation-id"],
  }),
);

app.use("*", async (c, next) => {
  const incomingCorrelationId = c.req.header("x-correlation-id");
  const correlationId = incomingCorrelationId ?? crypto.randomUUID();

  c.header("x-correlation-id", correlationId);
  c.set("correlationId", correlationId);

  await next();
});

app.post("/api/v1/auth/demo-login", async (c) => {
  const correlationId = c.get("correlationId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = z
    .object({
      displayName: z.string().trim().min(1).max(60).optional(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid login request",
        status: 400,
        detail: "displayName must be 1 to 60 characters when provided.",
        code: "auth.demo_login.invalid_request",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  const user: AuthUser = {
    userId: "demo-user",
    displayName: parsed.data.displayName ?? "Demo user",
  };

  return c.json({
    tokenType: "Bearer",
    accessToken: createDevAccessToken(user),
    user,
  });
});

app.get("/api/v1/auth/me", (c) => {
  const correlationId = c.get("correlationId");
  const auth = requireAuthUser(c.req.header("Authorization"), correlationId);

  if (!auth.ok) {
    return auth.response;
  }

  return c.json({ user: auth.user });
});

app.get("/api/v1/health", (c) => {
  return c.json({
    status: "ok",
    service: "labellens-api",
    time: new Date().toISOString(),
    usdaMode: appConfig.usdaApiKey ? "live" : "fixture",
    openFoodFactsMode: appConfig.openFoodFactsMode === "live" ? "live" : "fixture",
  });
});

app.get("/api/v1/foods/search", async (c) => {
  const correlationId = c.get("correlationId");

  const querySchema = z.object({
    q: z.string().min(2),
    page: z.coerce.number().int().positive().optional().default(1),
  });

  const parsed = querySchema.safeParse({
    q: c.req.query("q"),
    page: c.req.query("page"),
  });

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid query",
        status: 400,
        detail: "q must have at least 2 characters.",
        code: "foods.search.invalid_query",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  try {
    const result = await searchFoods(parsed.data.q, parsed.data.page);

    return c.json({
      ...result,
      page: parsed.data.page,
    });
  } catch (error) {
    return c.json(
      problemDetails({
        title: "USDA unavailable",
        status: 503,
        detail: error instanceof Error ? error.message : "Food data provider failed.",
        code: "foods.search.provider_unavailable",
        correlationId,
      }),
      503,
    );
  }
});

app.get("/api/v1/foods/:fdcId", async (c) => {
  const correlationId = c.get("correlationId");
  const parsed = z.string().min(1).safeParse(c.req.param("fdcId"));

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid food id",
        status: 400,
        detail: "fdcId is required.",
        code: "foods.detail.invalid_id",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  try {
    const result = await getFoodById(parsed.data);

    if (!result) {
      return c.json(
        problemDetails({
          title: "Food not found",
          status: 404,
          detail: "No USDA food exists in the current source mode for that fdcId.",
          code: "foods.detail.not_found",
          correlationId,
        }),
        404,
      );
    }

    return c.json(result);
  } catch (error) {
    return c.json(
      problemDetails({
        title: "USDA unavailable",
        status: 503,
        detail: error instanceof Error ? error.message : "Food detail provider failed.",
        code: "foods.detail.provider_unavailable",
        correlationId,
      }),
      503,
    );
  }
});

app.get("/api/v1/products/barcode/:barcode", async (c) => {
  const correlationId = c.get("correlationId");
  const parsed = z
    .string()
    .regex(/^\d{8,14}$/, "barcode must be 8 to 14 digits")
    .safeParse(c.req.param("barcode"));

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid barcode",
        status: 400,
        detail: "Barcode must contain 8 to 14 digits.",
        code: "products.barcode.invalid_barcode",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  try {
    const result = await lookupProductByBarcode(parsed.data);

    if (!result) {
      return c.json(
        problemDetails({
          title: "Product not found",
          status: 404,
          detail: "Open Food Facts does not have a product for that barcode in the current source mode.",
          code: "product.not_found",
          correlationId,
        }),
        404,
      );
    }

    return c.json(result);
  } catch (error) {
    return c.json(
      problemDetails({
        title: "Open Food Facts unavailable",
        status: 503,
        detail: error instanceof Error ? error.message : "Product data provider failed.",
        code: "products.barcode.provider_unavailable",
        correlationId,
      }),
      503,
    );
  }
});

app.get("/api/v1/products/search", async (c) => {
  const correlationId = c.get("correlationId");
  const parsed = z
    .object({
      q: z.string().min(2),
    })
    .safeParse({
      q: c.req.query("q"),
    });

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid product query",
        status: 400,
        detail: "q must have at least 2 characters.",
        code: "products.search.invalid_query",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  return c.json(await searchProducts(parsed.data.q));
});

app.post("/api/v1/menus/calculate", async (c) => {
  const correlationId = c.get("correlationId");
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      items: z.array(menuCalculationItemSchema).default([]),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid menu calculation request",
        status: 400,
        detail: "items must include source, sourceId, displayName, grams and nutrition facts.",
        code: "menus.calculate.invalid_request",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  try {
    return c.json(calculateMenu(parsed.data.items.map(toMenuItem)));
  } catch (error) {
    return c.json(
      problemDetails({
        title: "Could not calculate menu",
        status: 422,
        detail: error instanceof Error ? error.message : "Menu calculation failed.",
        code: "menus.calculate.failed",
        correlationId,
      }),
      422,
    );
  }
});

app.post("/api/v1/menus", async (c) => {
  const correlationId = c.get("correlationId");
  const auth = requireAuthUser(c.req.header("Authorization"), correlationId);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await c.req.json().catch(() => null);
  const parsed = saveMenuSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid saved menu request",
        status: 400,
        detail: "Saved menus require meals with source, sourceId, displayName, grams and nutrition facts.",
        code: "menus.save.invalid_request",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  const saveInput: SaveMenuInput = {
    ownerId: auth.user.userId,
    meals: parsed.data.meals.map(toMenuMeal),
  };

  if (parsed.data.name) {
    saveInput.name = parsed.data.name;
  }

  if (parsed.data.date) {
    saveInput.date = parsed.data.date;
  }

  const menu = saveMenu(saveInput);

  return c.json({ menu }, 201);
});

app.put("/api/v1/menus/:menuId", async (c) => {
  const correlationId = c.get("correlationId");
  const auth = requireAuthUser(c.req.header("Authorization"), correlationId);

  if (!auth.ok) {
    return auth.response;
  }

  const menuId = z.string().min(1).safeParse(c.req.param("menuId"));

  if (!menuId.success) {
    return c.json(
      problemDetails({
        title: "Invalid menu id",
        status: 400,
        detail: "menuId is required.",
        code: "menus.update.invalid_id",
        correlationId,
        details: menuId.error.issues,
      }),
      400,
    );
  }

  const body = await c.req.json().catch(() => null);
  const parsed = saveMenuSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid menu update request",
        status: 400,
        detail: "Updated menus require meals with source, sourceId, displayName, grams and nutrition facts.",
        code: "menus.update.invalid_request",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  const updateInput: UpdateMenuInput = {
    ownerId: auth.user.userId,
    menuId: menuId.data,
    meals: parsed.data.meals.map(toMenuMeal),
  };

  if (parsed.data.name) {
    updateInput.name = parsed.data.name;
  }

  if (parsed.data.date) {
    updateInput.date = parsed.data.date;
  }

  const menu = updateMenu(updateInput);

  if (!menu) {
    return c.json(
      problemDetails({
        title: "Menu not found",
        status: 404,
        detail: "No saved menu exists for this user and id.",
        code: "menus.update.not_found",
        correlationId,
      }),
      404,
    );
  }

  return c.json({ menu });
});

app.get("/api/v1/menus", (c) => {
  const correlationId = c.get("correlationId");
  const auth = requireAuthUser(c.req.header("Authorization"), correlationId);

  if (!auth.ok) {
    return auth.response;
  }

  return c.json({ items: listMenus(auth.user.userId) });
});

app.delete("/api/v1/menus/:menuId", (c) => {
  const correlationId = c.get("correlationId");
  const auth = requireAuthUser(c.req.header("Authorization"), correlationId);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = z.string().min(1).safeParse(c.req.param("menuId"));

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid menu id",
        status: 400,
        detail: "menuId is required.",
        code: "menus.delete.invalid_id",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  const deleted = deleteMenu(auth.user.userId, parsed.data);

  if (!deleted) {
    return c.json(
      problemDetails({
        title: "Menu not found",
        status: 404,
        detail: "No saved menu exists for this user and id.",
        code: "menus.delete.not_found",
        correlationId,
      }),
      404,
    );
  }

  return c.json({ deleted: true });
});

app.get("/api/v1/menus/:menuId", (c) => {
  const correlationId = c.get("correlationId");
  const auth = requireAuthUser(c.req.header("Authorization"), correlationId);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = z.string().min(1).safeParse(c.req.param("menuId"));

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid menu id",
        status: 400,
        detail: "menuId is required.",
        code: "menus.detail.invalid_id",
        correlationId,
        details: parsed.error.issues,
      }),
      400,
    );
  }

  const menu = getMenu(auth.user.userId, parsed.data);

  if (!menu) {
    return c.json(
      problemDetails({
        title: "Menu not found",
        status: 404,
        detail: "No saved menu exists for this user and id.",
        code: "menus.detail.not_found",
        correlationId,
      }),
      404,
    );
  }

  return c.json({ menu });
});
