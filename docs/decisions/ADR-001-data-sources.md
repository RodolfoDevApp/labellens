# ADR-001: Data sources

## Status

Accepted for v1.

## Decision

Use USDA FoodData Central for generic foods and Open Food Facts for packaged products. The browser never calls either source directly.

## Consequences

- Backend owns API keys, rate limits, normalization and cache.
- UI must show source, source ID, freshness and completeness.
- Missing nutrition fields remain missing and produce partial-data notices.
- No AI completion is allowed in v1.
