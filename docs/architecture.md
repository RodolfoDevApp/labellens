# LabelLens architecture

LabelLens v1 now runs locally as a private-service backend behind a single gateway boundary.

## Local runtime

```text
web -> gateway :4000
        -> auth-service :4105
        -> food-service :4101
        -> product-service :4102
        -> menu-service :4103
        -> favorites-service :4104
        -> LocalStack DynamoDB/SQS
```

Only `gateway` is a public backend entrypoint. The business services are private inside the Docker network and are not consumed by the browser.

## Services

| Service | Responsibility |
| --- | --- |
| `apps/gateway` | Public HTTP boundary, CORS, correlation id, route-to-service proxy, `/api/v1/health`. |
| `apps/auth-service` | Local demo login and current-user session validation. This is local/dev auth until Cognito replaces it. |
| `apps/food-service` | USDA food search/detail, fixture fallback, USDA normalization and food cache. |
| `apps/product-service` | Open Food Facts barcode lookup/search fallback, OFF normalization and product cache. |
| `apps/menu-service` | Menu calculation plus saved-menu CRUD through application commands/queries. |
| `apps/favorites-service` | Favorite save/list/delete through application commands/queries. |

## Package boundaries

| Package | Responsibility |
| --- | --- |
| `@labellens/domain` | Pure business types and calculation logic. No Hono, AWS SDK, fetch or process env. |
| `@labellens/application` | Commands, queries and ports. No HTTP framework and no concrete AWS client. |
| `@labellens/contracts` | Zod schemas, client contracts and generated OpenAPI artifacts. |
| `@labellens/infrastructure` | DynamoDB adapters, in-memory adapters, local dev auth token/verifier and event publisher adapters. |
| `@labellens/service-support` | HTTP support shared by services: correlation id, Problem Details and auth guard helpers. |

## Rules

- The browser never calls USDA, Open Food Facts or a private service directly.
- The gateway is the only public backend entrypoint.
- Business services do not expose host ports in Docker compose.
- Services verify protected requests independently using the current auth verifier.
- Data persistence is through DynamoDB adapters when `STORAGE_DRIVER=dynamodb`.
- `apps/api` has been removed as the monolithic backend. Its responsibilities are split across the services above.


## Phase 7 messaging boundary

LabelLens does not use Kafka, RabbitMQ, SNS or an EventBridge event bus in v1. Local/AWS messaging is SQS + DLQ only, with EventBridge Scheduler reserved for later scheduled cache refresh jobs.

Current implemented event flow:

```txt
product-service
  -> publishes product.not_found.v1
  -> labellens-product-not-found-queue
  -> product-not-found-worker
  -> DynamoDB LabelLensTable / OPS#PRODUCT_NOT_FOUND
```

The producer is `product-service`. The consumer is `product-not-found-worker`. The event is operational; it must never block the barcode lookup response. Duplicate SQS delivery is handled by saving records idempotently by `eventId`.
