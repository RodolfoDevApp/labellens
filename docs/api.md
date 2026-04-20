# API v1

Base URL local: `http://localhost:4000`

The source of truth for API shape is now OpenAPI, generated from `@labellens/contracts`:

```txt
packages/contracts/generated/openapi.json
packages/contracts/generated/openapi.yaml
```

Generate the files with:

```bash
npm run generate:openapi
```

This document is the human summary only. If this file and OpenAPI disagree, OpenAPI wins.

## Scope sealed for v1

Included:

- Food search/detail through USDA-backed backend routes.
- Barcode product lookup through Open Food Facts-backed backend routes.
- Menu calculation by grams.
- Authenticated saved menus.
- Authenticated favorites as shortcuts with default grams.

Excluded:

- Compare.
- Recipes.
- Pantry inventory.
- Export/PDF.
- Ranking or “better option” recommendations.

## Public routes

| Method | Route | Use |
| --- | --- | --- |
| `GET` | `/api/v1/health` | API health, source mode and storage driver. |
| `POST` | `/api/v1/auth/demo-login` | Local-only demo token. |
| `GET` | `/api/v1/foods/search?q=&page=` | Search USDA foods through backend. |
| `GET` | `/api/v1/foods/{fdcId}` | Get one USDA food detail. |
| `GET` | `/api/v1/products/barcode/{barcode}` | Look up one packaged product by barcode. |
| `GET` | `/api/v1/products/search?q=` | Fixture-only/reserved product search. |
| `POST` | `/api/v1/menus/calculate` | Calculate menu totals from grams and nutrition facts. |

## Protected routes

Protected routes require `Authorization: Bearer <token>`.

| Method | Route | Use |
| --- | --- | --- |
| `GET` | `/api/v1/auth/me` | Return the current authenticated user. |
| `POST` | `/api/v1/menus` | Save a personal menu. |
| `GET` | `/api/v1/menus` | List personal saved menus. |
| `GET` | `/api/v1/menus/{menuId}` | Read one owned saved menu. |
| `PUT` | `/api/v1/menus/{menuId}` | Update one owned saved menu. |
| `DELETE` | `/api/v1/menus/{menuId}` | Delete one owned saved menu. |
| `POST` | `/api/v1/favorites` | Save or update one favorite food/product with default grams. |
| `GET` | `/api/v1/favorites` | List personal favorites. |
| `DELETE` | `/api/v1/favorites/{favoriteId}` | Delete one owned favorite. |

## Menu calculation request

```json
{
  "items": [
    {
      "id": "breakfast-USDA-168874",
      "source": "USDA",
      "sourceId": "168874",
      "displayName": "Oats, raw",
      "grams": 40,
      "nutrition": {
        "energyKcalPer100g": 389,
        "proteinGPer100g": 16.89,
        "carbsGPer100g": 66.27,
        "fatGPer100g": 6.9,
        "source": "USDA",
        "sourceId": "168874",
        "lastFetchedAt": "2026-04-18T00:00:00.000Z",
        "completeness": "COMPLETE"
      }
    }
  ]
}
```

## Error shape

All HTTP errors use the same Problem Details shape:

```json
{
  "type": "https://labellens.app/errors/product.not_found",
  "title": "Product not found",
  "status": 404,
  "detail": "Open Food Facts does not have a product for that barcode in the current source mode.",
  "code": "product.not_found",
  "correlationId": "..."
}
```

## OpenAPI verification

The OpenAPI contract is sealed for the current v1 scope. Any route addition, removal or auth-boundary change must update `packages/contracts/src/openapi/openapi-document.ts`, `packages/contracts/src/openapi/expected-v1-routes.ts`, and the generated artifacts.

Run:

```powershell
npm run generate:openapi
npm run check:openapi
```

`check:openapi` fails when:

- `openapi.json` or `openapi.yaml` is stale.
- A current v1 route is missing from the contract.
- An unexpected route appears in the contract.
- A protected route does not declare bearer auth.
- A public route accidentally declares bearer auth.
- An out-of-scope path such as compare, recipes, pantry or export appears again.
