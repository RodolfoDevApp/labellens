# API v1

Base URL local: `http://localhost:4000`

## GET `/api/v1/health`

Returns API status and whether external providers are running from fixtures or live API.

## GET `/api/v1/foods/search?q=&page=`

Searches USDA foods through the backend.

Response:

```json
{
  "items": [],
  "source": "USDA",
  "sourceMode": "fixture",
  "queryUsed": "oats",
  "page": 1
}
```

## GET `/api/v1/foods/{fdcId}`

Returns one USDA food detail by FDC ID.

Response:

```json
{
  "food": {
    "id": "USDA-168874",
    "name": "Oats, raw",
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
  },
  "nutritionFacts": {},
  "source": "USDA",
  "sourceMode": "fixture"
}
```

## GET `/api/v1/products/barcode/{barcode}`

Looks up a packaged product by barcode through the backend. The browser never calls Open Food Facts directly.

Response:

```json
{
  "product": {
    "barcode": "3017624010701",
    "name": "Nutella",
    "brand": "Ferrero",
    "ingredientsText": "Sugar, palm oil, hazelnuts...",
    "allergens": ["milk", "nuts"],
    "additives": ["emulsifier"],
    "novaGroup": 4,
    "nutriScore": "e",
    "nutrition": {
      "energyKcalPer100g": 539,
      "proteinGPer100g": 6.3,
      "carbsGPer100g": 57.5,
      "fatGPer100g": 30.9,
      "source": "OPEN_FOOD_FACTS",
      "sourceId": "3017624010701",
      "lastFetchedAt": "2026-04-18T00:00:00.000Z",
      "completeness": "PARTIAL"
    }
  },
  "source": "OPEN_FOOD_FACTS",
  "sourceMode": "fixture"
}
```

A missing product returns `404 product.not_found`. The UI treats that as a useful state, not a broken screen.

## GET `/api/v1/products/search?q=`

Fixture-only in T2. Reserved for future packaged product search. Barcode lookup is the scanner path.

## POST `/api/v1/menus/calculate`

Calculates menu totals from nutrition facts per 100 g and user grams.

Request:

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

Response:

```json
{
  "totals": {
    "energyKcal": 155.6,
    "proteinG": 6.76,
    "carbsG": 26.51,
    "fatG": 2.76,
    "partialData": false
  },
  "partialData": false,
  "warnings": []
}
```

## Errors

Errors use Problem Details shape:

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
