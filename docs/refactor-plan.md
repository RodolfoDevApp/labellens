# Refactor plan: persistence and mixed architecture

## Current state after Phase 6

The local backend is no longer a single monolithic API app. The public backend boundary is `apps/gateway`, and business endpoints are split into private services:

- `apps/auth-service`: local demo auth endpoints.
- `apps/food-service`: USDA search/detail and food cache.
- `apps/product-service`: Open Food Facts barcode/search fallback and product cache.
- `apps/menu-service`: menu calculation and saved-menu CRUD.
- `apps/favorites-service`: favorite save/list/delete.

The old `apps/api` monolith is removed. Shared rules live in packages:

- `@labellens/domain`: pure domain model and nutrition calculations.
- `@labellens/application`: commands, queries and ports.
- `@labellens/contracts`: schemas, client contracts and OpenAPI.
- `@labellens/infrastructure`: DynamoDB, in-memory adapters, local auth and events.
- `@labellens/service-support`: HTTP support shared by private services.

## Scope kept for v1

- USDA search/detail.
- Open Food Facts barcode lookup.
- Add food/product to menu by grams.
- Temporary menu draft.
- Save/list/update/delete personal menus.
- Save/list/delete favorites with default grams.
- Week board using saved menus.

## Scope removed from v1

- Compare.
- Recipe CRUD.
- Pantry inventory.
- Export/PDF jobs.
- Product recommendation or “better option” ranking.

## Local runtime rule

```text
web -> gateway -> private services -> DynamoDB/SQS LocalStack
```

The browser must never call private services directly. Services expose only Docker-network ports. The gateway keeps `/api/v1/*` stable for the frontend.

## Next refactor steps

1. Add service-level tests for food/product/menu/favorites/auth behavior.
2. Add SQS event publisher adapter and route `product.not_found.v1` through the product service.
3. Add local Lambda/worker runners for product-not-found and analytics queues.
4. Add OpenAPI gateway/service routing documentation once workers are in place.
