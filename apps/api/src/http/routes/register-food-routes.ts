import type { Hono } from "hono";
import { getFoodById, searchFoods } from "../../foods/food-service.js";
import { problemDetails } from "../../shared/problem-details.js";
import type { AppBindings } from "../app-bindings.js";
import { foodSearchQuerySchema } from "../schemas/food-search-query-schema.js";
import { requiredIdParamSchema } from "../schemas/required-id-param-schema.js";

export function registerFoodRoutes(app: Hono<AppBindings>): void {
  app.get("/api/v1/foods/search", async (c) => {
    const correlationId = c.get("correlationId");
    const parsed = foodSearchQuerySchema.safeParse({
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
    const parsed = requiredIdParamSchema.safeParse(c.req.param("fdcId"));

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
}
