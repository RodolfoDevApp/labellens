import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
import { appConfig } from "./config/app-config.js";
import { getFoodById, searchFoods } from "./foods/food-service.js";
import type { MenuItem, NutritionFacts } from "@labellens/domain";
import { calculateMenu } from "./menus/menu-service.js";
import { problemDetails } from "./shared/problem-details.js";

type AppBindings = {
  Variables: {
    correlationId: string;
  };
};

const app = new Hono<AppBindings>();

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

type ParsedNutritionFacts = z.infer<typeof nutritionFactsSchema>;
type ParsedMenuCalculationItem = z.infer<typeof menuCalculationItemSchema>;

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

app.get("/api/v1/health", (c) => {
  return c.json({
    status: "ok",
    service: "labellens-api",
    time: new Date().toISOString(),
    usdaMode: appConfig.usdaApiKey ? "live" : "fixture",
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

serve(
  {
    fetch: app.fetch,
    port: appConfig.port,
  },
  (info) => {
    console.log(`LabelLens API running at http://localhost:${info.port}`);
  },
);
