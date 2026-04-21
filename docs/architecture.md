# Architecture

## Shape

```text
Next.js PWA
  -> local Hono API runner now
  -> HTTP microservices later for business APIs
  -> Lambdas later only for background jobs and event consumers
  -> DynamoDB single-table later / in-memory stores now
  -> USDA FoodData Central
  -> Open Food Facts
```

## Current implemented modules

- `apps/api/src/foods`: USDA search/detail, fixture fallback, normalizer and cache-aside interface.
- `apps/api/src/products`: Open Food Facts barcode/search, fixtures, normalizer and cache-aside interface.
- `apps/api/src/menus`: menu calculation and protected saved-menu endpoints.
- `apps/api/src/favorites`: authenticated favorites with default grams for quick reuse.
- `apps/api/src/auth`: local development auth adapter for progressive save flow.
- `packages/domain`: source contracts and pure nutrition math.
- `apps/web/src/features/food-search`: mobile search, result cards, nutrition/source modal, gram input, favorites modal and temporary menu drawer.
- `apps/web/src/features/scanner`: barcode scan/fallback flow, favorites modal and product-to-menu cards.
- `apps/web/src/features/profile`: saved menus, current draft preview and week board.
- `apps/web/src/features/menu-draft`: shared device-local draft used by search, scan, drawer and profile page.

## Current deliberate compromise

The repo keeps product flow moving with in-memory API stores and a local development token. That is acceptable only as a temporary implementation detail. The API shape should not stay tied to `Map` storage.

The production replacement points are repositories, auth verification and event publishing. Do not split deployables before those ports exist, or the project will only move in-memory state into different folders.

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

The floating drawer is the fast editing surface. The `/menu` route is the account/menu surface: current menu preview, saved menus, week board and login/register access. It is not an export surface.

## T5 favorites surface

Favorites are personal shortcuts behind auth. They are saved from search or scan with default grams and shown behind a modal button in both `/search` and `/scan`. They are not pantry inventory.

## Next architecture step

Create these ports before cloud persistence or physical service splitting:

- `FoodCacheRepository`
- `ProductCacheRepository`
- `SavedMenuRepository`
- `FavoriteRepository`
- `AuthSessionVerifier`
- `EventPublisher`

## Microservice/Lambda split target

Business APIs should become HTTP microservices when the ports are stable:

- `food-service`: USDA search/detail, normalizer and food cache.
- `product-service`: Open Food Facts barcode lookup, normalizer and product cache.
- `menu-service`: calculate, save, list, update and delete menus.
- `favorites-service`: save, list and delete favorites.

Lambdas should stay for background work only:

- `food-cache-refresh`
- `product-cache-refresh`
- `missing-product-tracker`
- `analytics-consumer`
- `dlq-handler`

No current v1 scope for compare, recipe CRUD, pantry inventory or export/PDF jobs.

## Local gateway boundary

Local Compose uses the same public boundary intended for AWS: the browser talks to the gateway, and the gateway forwards `/api/v1/*` to the private API service. The API service is not published as a host port in Compose. This is an intermediate step before splitting the API process into separate private services.
