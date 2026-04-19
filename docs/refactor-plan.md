# Refactor plan: persistence and mixed architecture

## Current state

The product flow exists, but backend persistence is still simulated:

- `apps/api/src/menus/persistence/menu-store.ts` uses in-memory `Map` storage.
- `apps/api/src/favorites/persistence/favorite-store.ts` uses in-memory `Map` storage.
- `apps/api/src/foods/food-cache.ts` uses in-memory cache.
- `apps/api/src/products/product-cache.ts` uses in-memory cache.
- `apps/api/src/auth/dev-auth.ts` signs and reads local development tokens.
- Docker/LocalStack exists, but the API does not yet write to DynamoDB.

That means Docker is not wrong, but it is not yet connected to the backend. The next useful work is repository ports and DynamoDB adapters, not more UI surface.

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

## First refactor step

Create interfaces before replacing storage:

```ts
export interface SavedMenuRepository {
  save(input: SaveMenuInput): SavedMenu;
  update(input: UpdateMenuInput): SavedMenu | null;
  list(ownerId: string): SavedMenu[];
  get(ownerId: string, menuId: string): SavedMenu | null;
  delete(ownerId: string, menuId: string): boolean;
}

export interface FavoriteRepository {
  save(input: SaveFavoriteInput): FavoriteItem;
  list(ownerId: string): FavoriteItem[];
  delete(ownerId: string, favoriteId: string): boolean;
}
```

Then keep current behavior through:

- `InMemorySavedMenuRepository`
- `InMemoryFavoriteRepository`
- `InMemoryFoodCacheRepository`
- `InMemoryProductCacheRepository`

After that, add:

- `DynamoDbSavedMenuRepository`
- `DynamoDbFavoriteRepository`
- `DynamoDbFoodCacheRepository`
- `DynamoDbProductCacheRepository`

## DynamoDB single-table draft

```text
PK=FOOD#USDA#<fdcId>
SK=DETAIL
expiresAt=<ttl>

PK=PRODUCT#OFF#<barcode>
SK=DETAIL
expiresAt=<ttl>

PK=USER#<userId>
SK=MENU#<date>#<menuId>

PK=USER#<userId>
SK=FAVORITE#<source>#<sourceId>
```

Use TTL only for cache rows. Do not TTL saved menus or favorites.

## Microservices

Keep these as HTTP services once repository ports are stable:

| Service | Responsibility |
| --- | --- |
| `food-service` | USDA search/detail, normalizer, food cache. |
| `product-service` | OFF barcode lookup, normalizer, product cache. |
| `menu-service` | calculate and persist menus. |
| `favorites-service` | persist and reuse favorite foods/products. |

## Lambdas

Use Lambdas for async/operational work only:

| Lambda | Responsibility |
| --- | --- |
| `food-cache-refresh` | Refresh popular USDA items. |
| `product-cache-refresh` | Refresh popular OFF products. |
| `missing-product-tracker` | Record barcode misses without blocking scan. |
| `analytics-consumer` | Consume internal usage events. |
| `dlq-handler` | Surface failed async jobs. |

## Order of work

1. Add repository interfaces and in-memory implementations.
2. Inject repositories into route handlers/services.
3. Add DynamoDB adapters against LocalStack.
4. Wire docker compose seed/table scripts.
5. Replace dev token verifier with an `AuthSessionVerifier` interface.
6. Add Cognito verifier only after local persistence is stable.
7. Split physical deployables after the service boundaries stop moving.
