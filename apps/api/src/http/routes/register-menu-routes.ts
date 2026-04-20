import type { Hono } from "hono";
import type { SaveMenuInput, UpdateMenuInput } from "@labellens/application";
import type { AppDependencies } from "../../composition/app-dependencies.js";
import { problemDetails } from "../../shared/problem-details.js";
import type { AppBindings } from "../app-bindings.js";
import { requireAuthUser } from "../auth/require-auth-user.js";
import { toMenuItem, toMenuMeal } from "../mappers/menu-request-mapper.js";
import { menuCalculationRequestSchema } from "../schemas/menu-calculation-request-schema.js";
import { requiredIdParamSchema } from "../schemas/required-id-param-schema.js";
import { saveMenuSchema } from "../schemas/save-menu-schema.js";

export function registerMenuRoutes(app: Hono<AppBindings>, dependencies: AppDependencies): void {
  app.post("/api/v1/menus/calculate", async (c) => {
    const correlationId = c.get("correlationId");
    const body = await c.req.json().catch(() => null);
    const parsed = menuCalculationRequestSchema.safeParse(body);

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
      return c.json(
        dependencies.useCases.calculateMenu.execute({
          items: parsed.data.items.map(toMenuItem),
        }),
      );
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
    const auth = await requireAuthUser(dependencies, c.req.header("Authorization"), correlationId);

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

    const menu = await dependencies.useCases.saveMenu.execute(saveInput);

    return c.json({ menu }, 201);
  });

  app.get("/api/v1/menus", async (c) => {
    const correlationId = c.get("correlationId");
    const auth = await requireAuthUser(dependencies, c.req.header("Authorization"), correlationId);

    if (!auth.ok) {
      return auth.response;
    }

    return c.json({ items: await dependencies.useCases.listMenus.execute(auth.user.userId) });
  });

  app.get("/api/v1/menus/:menuId", async (c) => {
    const correlationId = c.get("correlationId");
    const auth = await requireAuthUser(dependencies, c.req.header("Authorization"), correlationId);

    if (!auth.ok) {
      return auth.response;
    }

    const parsed = requiredIdParamSchema.safeParse(c.req.param("menuId"));

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

    const menu = await dependencies.useCases.getMenu.execute({
      ownerId: auth.user.userId,
      menuId: parsed.data,
    });

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

  app.put("/api/v1/menus/:menuId", async (c) => {
    const correlationId = c.get("correlationId");
    const auth = await requireAuthUser(dependencies, c.req.header("Authorization"), correlationId);

    if (!auth.ok) {
      return auth.response;
    }

    const menuId = requiredIdParamSchema.safeParse(c.req.param("menuId"));

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

    const menu = await dependencies.useCases.updateMenu.execute(updateInput);

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

  app.delete("/api/v1/menus/:menuId", async (c) => {
    const correlationId = c.get("correlationId");
    const auth = await requireAuthUser(dependencies, c.req.header("Authorization"), correlationId);

    if (!auth.ok) {
      return auth.response;
    }

    const parsed = requiredIdParamSchema.safeParse(c.req.param("menuId"));

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

    const deleted = await dependencies.useCases.deleteMenu.execute({
      ownerId: auth.user.userId,
      menuId: parsed.data,
    });

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
}