import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
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
    time: new Date().toISOString()
  });
});

app.get("/api/v1/foods/search", (c) => {
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

  const result = searchFoods(parsed.data.q);

  return c.json({
    ...result,
    page: parsed.data.page
  });
});

const port = Number(process.env.PORT ?? 4000);

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`LabelLens API running at http://localhost:${info.port}`);
  },
);
