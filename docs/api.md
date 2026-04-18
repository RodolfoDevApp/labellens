# API v1

Base URL local: `http://localhost:4000`

## GET `/api/v1/health`

Returns API status and whether USDA is running from fixtures or live API.

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
  "type": "https://labellens.app/errors/foods.detail.not_found",
  "title": "Food not found",
  "status": 404,
  "detail": "No USDA food exists in the current source mode for that fdcId.",
  "code": "foods.detail.not_found",
  "correlationId": "..."
}
```
