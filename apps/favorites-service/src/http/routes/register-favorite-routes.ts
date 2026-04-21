import type { Hono } from "hono";
import { favoriteItemInputSchema, requiredIdParamSchema } from "@labellens/contracts";
import { problemDetails, requireAuthUser, type ServiceBindings } from "@labellens/service-support";
import type { FavoritesServiceDependencies } from "../../composition/favorites-service-dependencies.js";
import { toNutritionFacts } from "../mappers/nutrition-facts-mapper.js";

export function registerFavoriteRoutes(
  app: Hono<ServiceBindings>,
  dependencies: FavoritesServiceDependencies,
): void {
  app.post("/api/v1/favorites", async (c) => {
    const correlationId = c.get("correlationId");
    const auth = await requireAuthUser(
      dependencies.authSessionVerifier,
      c.req.header("Authorization"),
      correlationId,
    );

    if (!auth.ok) {
      return auth.response;
    }

    const body = await c.req.json().catch(() => null);
    const parsed = favoriteItemInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid favorite",
          status: 400,
          detail: "Favorites require a name, grams and nutrition facts.",
          code: "favorites.save.invalid_request",
          correlationId,
          details: parsed.error.issues,
        }),
        400,
      );
    }

    const item = await dependencies.useCases.saveFavorite.execute({
      ownerId: auth.user.userId,
      source: parsed.data.source,
      sourceId: parsed.data.sourceId,
      displayName: parsed.data.displayName,
      defaultGrams: parsed.data.grams,
      nutrition: toNutritionFacts(parsed.data.nutrition),
    });

    return c.json({ item }, 201);
  });

  app.get("/api/v1/favorites", async (c) => {
    const correlationId = c.get("correlationId");
    const auth = await requireAuthUser(
      dependencies.authSessionVerifier,
      c.req.header("Authorization"),
      correlationId,
    );

    if (!auth.ok) {
      return auth.response;
    }

    return c.json({ items: await dependencies.useCases.listFavorites.execute(auth.user.userId) });
  });

  app.delete("/api/v1/favorites/:favoriteId", async (c) => {
    const correlationId = c.get("correlationId");
    const auth = await requireAuthUser(
      dependencies.authSessionVerifier,
      c.req.header("Authorization"),
      correlationId,
    );

    if (!auth.ok) {
      return auth.response;
    }

    const parsed = requiredIdParamSchema.safeParse(c.req.param("favoriteId"));

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid favorite id",
          status: 400,
          detail: "favorite id is required.",
          code: "favorites.delete.invalid_id",
          correlationId,
          details: parsed.error.issues,
        }),
        400,
      );
    }

    const deleted = await dependencies.useCases.deleteFavorite.execute({
      ownerId: auth.user.userId,
      favoriteId: parsed.data,
    });

    if (!deleted) {
      return c.json(
        problemDetails({
          title: "Favorite not found",
          status: 404,
          detail: "No favorite exists for this user and id.",
          code: "favorites.delete.not_found",
          correlationId,
        }),
        404,
      );
    }

    return c.json({ deleted: true });
  });
}
