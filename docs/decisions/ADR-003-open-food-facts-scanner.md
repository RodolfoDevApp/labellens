# ADR-003: Open Food Facts scanner path

## Status

Accepted for T2.

## Decision

LabelLens resolves packaged products through the backend endpoint `GET /api/v1/products/barcode/{barcode}`. The web app can use camera detection when the browser supports it, but manual barcode entry is always visible as the reliable fallback.

## Reasons

- The browser must not call Open Food Facts directly.
- The backend owns source attribution, normalization, cache and rate-control points.
- Camera permission failure must not block the product lookup flow.
- `404 product.not_found` is a valid product state, not a fatal UI error.

## Implementation notes

- Local and test mode use fixtures.
- Live mode is opt-in with `OPEN_FOOD_FACTS_MODE=live`.
- Backend requests include a custom `User-Agent`.
- The normalized product keeps `source`, `sourceId`, `lastFetchedAt`, `completeness`, ingredients, allergens, additives, Nutri-Score and NOVA when available.
