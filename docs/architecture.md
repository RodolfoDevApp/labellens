# Architecture

## Shape

```text
Next.js PWA
  -> API Gateway later / local Hono runner now
  -> Lambda-shaped API modules
  -> DynamoDB single-table later / in-memory cache now
  -> USDA FoodData Central
  -> Open Food Facts later
```

## Current implemented modules

- `apps/api/src/foods`: USDA search/detail, fixture fallback, normalizer and cache-aside interface.
- `apps/api/src/menus`: menu total calculation API wrapper.
- `packages/domain`: source contracts and pure nutrition math.
- `apps/web/src/features/food-search`: mobile search, result cards, nutrition/source modal, gram input and temporary menu drawer.

## Current deliberate compromise

The spec calls for DynamoDB cache in T1. This repo now has cache-aside behavior with an in-memory implementation so the contracts and UX can move forward without adding AWS SDK wiring prematurely. The next backend step is to replace `food-cache.ts` with a repository port and DynamoDB adapter under `packages/infrastructure`.

## Data principles

Every external item keeps:

- `source`
- `sourceId`
- `lastFetchedAt`
- `completeness`

The UI must surface partial data instead of inventing nutrition facts.

## Handler rules

`apps/api/src/app.ts` owns the Hono routes so tests can call `app.request(...)` without starting a server. `apps/api/src/server.ts` only starts the local HTTP listener.

API route code should remain thin:

1. Parse request.
2. Validate with Zod.
3. Call a service/use case.
4. Return JSON or Problem Details.

## Next architecture step

Create these ports before adding scanner/OFF:

- `FoodCacheRepository`
- `ProductCacheRepository`
- `ExternalFoodProvider`
- `ExternalProductProvider`
- `EventPublisher`
