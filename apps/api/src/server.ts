import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
import { appConfig } from "./config/app-config.js";
import { searchFoods } from "./foods/food-service.js";
import { problemDetails } from "./shared/problem-details.js";

type AppBindings = {
  Variables: {
    correlationId: string;
  };
};

const app = new Hono<AppBindings>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-correlation-id"]
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
    usdaMode: appConfig.usdaApiKey ? "live" : "fixture"
  });
});

app.get("/api/v1/foods/search", async (c) => {
  const correlationId = c.get("correlationId");

  const querySchema = z.object({
    q: z.string().min(2),
    page: z.coerce.number().int().positive().optional().default(1)
  });

  const parsed = querySchema.safeParse({
    q: c.req.query("q"),
    page: c.req.query("page")
  });

  if (!parsed.success) {
    return c.json(
      problemDetails({
        title: "Invalid query",
        status: 400,
        detail: "q must have at least 2 characters.",
        code: "foods.search.invalid_query",
        correlationId,
        details: parsed.error.issues
      }),
      400,
    );
  }

  try {
    const result = await searchFoods(parsed.data.q, parsed.data.page);

    return c.json({
      ...result,
      page: parsed.data.page
    });
  } catch (error) {
    return c.json(
      problemDetails({
        title: "USDA unavailable",
        status: 503,
        detail: error instanceof Error ? error.message : "Food data provider failed.",
        code: "foods.search.provider_unavailable",
        correlationId
      }),
      503,
    );
  }
});

serve(
  {
    fetch: app.fetch,
    port: appConfig.port
  },
  (info) => {
    console.log(`LabelLens API running at http://localhost:${info.port}`);
  },
);
