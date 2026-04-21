# Refactor plan: persistence and mixed architecture

## Current state after Phase 7B

The local backend is no longer a single monolithic API app. The public backend boundary is `apps/gateway`, and business endpoints are split into private services:

- `apps/auth-service`: local demo auth endpoints.
- `apps/food-service`: USDA search/detail, food cache and private food-cache refresh endpoint.
- `apps/product-service`: Open Food Facts barcode/search fallback, product cache and private product-cache refresh endpoint.
- `apps/menu-service`: menu calculation and saved-menu CRUD.
- `apps/favorites-service`: favorite save/list/delete.

The old `apps/api` monolith is removed. Shared rules live in packages:

- `@labellens/domain`: pure domain model and nutrition calculations.
- `@labellens/application`: commands, queries, events and ports.
- `@labellens/contracts`: schemas, client contracts and OpenAPI.
- `@labellens/infrastructure`: DynamoDB, SQS, in-memory adapters, local auth and event infrastructure.
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

## Phase 7B async runtime

Implemented local workers:

- `apps/product-not-found-worker`: consumes `product.not_found.v1` from `labellens-product-not-found-queue` and records operational events/aggregates in DynamoDB.
- `apps/analytics-worker`: consumes analytics events from `labellens-analytics-queue` and records operational analytics in DynamoDB.
- `apps/food-cache-refresh-worker`: consumes `cache.refresh.food.requested.v1` from `labellens-food-cache-refresh-queue` and asks the private food service to refresh existing cached food detail records.
- `apps/product-cache-refresh-worker`: consumes `cache.refresh.product.requested.v1` from `labellens-product-cache-refresh-queue` and asks the private product service to refresh existing cached product detail records.
- `apps/dlq-handler`: consumes the four DLQs and records safe debugging records under `OPS#DLQ#`.

All consumers use the common `LabelLensEvent` envelope with `eventId`, `eventType`, `eventVersion`, `occurredAt`, `correlationId`, `producer` and `payload`.

## Next refactor steps

1. Add AWS event source mappings and schedules when moving from local workers to deployed compute.
2. Add production Dockerfile/build pipeline before creating ECS services or Lambda container images.
3. Add API Gateway/Cognito/ECS/Fargate only after the local async contract remains green.
