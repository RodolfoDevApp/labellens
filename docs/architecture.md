# Architecture

## Shape

```text
Next.js PWA
  -> local Hono API runner now / API Gateway later
  -> Lambda-shaped API modules
  -> DynamoDB single-table later / in-memory cache and stores now
  -> USDA FoodData Central
  -> Open Food Facts
```

## Current implemented modules

- `apps/api/src/foods`: USDA search/detail, fixture fallback, normalizer and cache-aside interface.
- `apps/api/src/products`: Open Food Facts barcode/search, fixtures, normalizer and cache-aside interface.
- `apps/api/src/menus`: menu calculation and protected saved-menu endpoints.
- `apps/api/src/auth`: local development auth adapter for progressive save flow.
- `packages/domain`: source contracts and pure nutrition math.
- `apps/web/src/features/food-search`: mobile search, result cards, nutrition/source modal, gram input and temporary menu drawer.
- `apps/web/src/features/scanner`: barcode scan/fallback flow and product-to-menu cards.
- `apps/web/src/features/profile`: saved menus, current draft preview and print/PDF preview surface.
- `apps/web/src/features/menu-draft`: shared device-local draft used by search, scan, drawer and profile page.

## Current deliberate compromise

The spec calls for DynamoDB cache and Cognito. This repo keeps the same external contracts but uses in-memory API stores and a local development token so the product flow can move without AWS wiring. The production replacement points are the repository/auth adapters, not the UI flow.

## Data principles

Every external item keeps:

- `source`
- `sourceId`
- `lastFetchedAt`
- `completeness`

The primary UI should show user-value information first. Technical traceability belongs in nutrition/source details, logs, tests and API responses.

## Handler rules

`apps/api/src/app.ts` owns the Hono routes so tests can call `app.request(...)` without starting a server. `apps/api/src/server.ts` only starts the local HTTP listener.

API route code should remain thin:

1. Parse request.
2. Validate with Zod.
3. Call a service/use case.
4. Return JSON or Problem Details.

## T3 temporary menu draft

The temporary menu draft is shared across `/search`, `/scan`, the floating menu drawer and `/menu` with `useMenuDraft`. It stores device-local draft items in `localStorage` so a user can search a generic food, scan a packaged product, then continue editing grams without logging in.

## T4 profile/save surface

The floating drawer is the fast editing surface. The `/menu` route is now the account/menu surface: it shows a clean current-menu preview, print/PDF preview action, saved menus, and login/register when needed. This avoids duplicating the drawer as a full page.

## Next architecture step

Create these ports before cloud persistence:

- `FoodCacheRepository`
- `ProductCacheRepository`
- `SavedMenuRepository`
- `AuthSessionVerifier`
- `EventPublisher`
