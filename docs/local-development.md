# Local development

## Start the full local stack

```powershell
npm run compose:down
npm run compose:up
npm run compose:ps
```

Expected public ports:

| Component | Public port |
| --- | --- |
| Web | `3000` by default |
| Gateway | `4000` by default |
| LocalStack | `4566` |
| DynamoDB Admin | `8001` |

Private services inside Docker:

| Service | Internal port |
| --- | --- |
| auth-service | `4105` |
| food-service | `4101` |
| product-service | `4102` |
| menu-service | `4103` |
| favorites-service | `4104` |

The browser must use only the gateway:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Resource checks

```powershell
npm run local:init
npm run local:resources:check
npm run local:persistence:smoke
```

`local:resources:check` verifies through the gateway that:

- `/api/v1/health` is reachable.
- The reported storage driver is `dynamodb`.
- `LabelLensTable` exists in LocalStack.
- TTL uses `expiresAt`.
- SQS queues and DLQs exist.
- Redrive policies are configured.

`local:persistence:smoke` saves a menu and favorite through the gateway, restarts `menu-service` and `favorites-service`, then reads the data again through the gateway. If the data survives, persistence is outside process memory.

## Build and test

```powershell
npm run build:domain
npm run build:contracts
npm run build -w @labellens/application
npm run build:infrastructure
npm run build:services
npm run build:gateway
npm run test:services
npm run test:gateway
npm run generate:openapi
npm run check:openapi
npm run build:web
```

## Useful logs

```powershell
npm run compose:logs:gateway
npm run compose:logs:food-service
npm run compose:logs:product-service
npm run compose:logs:menu-service
npm run compose:logs:favorites-service
npm run compose:logs:auth-service
npm run compose:logs:localstack
```

## Phase 7 local messaging smoke

Phase 7 uses real local messaging for `product.not_found.v1`.

Runtime path:

```txt
product-service -> SQS labellens-product-not-found-queue -> product-not-found-worker -> DynamoDB LabelLensTable
```

The product lookup response must not depend on the queue being processed. Missing barcode scans still return `404 product.not_found` through the gateway. The worker consumes the SQS message asynchronously and records an operational item with `PK=OPS#PRODUCT_NOT_FOUND`.

Verify the local event flow with:

```powershell
npm run compose:up
npm run local:resources:check
npm run local:events:smoke
```

Useful logs:

```powershell
npm run compose:logs:product-service
npm run compose:logs:product-not-found-worker
npm run compose:logs:localstack
```

## Fase 7B: analytics async local

El flujo local de analytics es no crítico y no debe bloquear respuestas HTTP. Los producers publican a `labellens-analytics-queue` y el `analytics-worker` consume la cola para registrar eventos operativos en DynamoDB bajo `PK=OPS#ANALYTICS`.

Eventos cerrados en esta fase:

| Evento | Producer | Cola | Consumer | Persistencia |
|---|---|---|---|---|
| `food.searched.v1` | `food-service` | `labellens-analytics-queue` | `analytics-worker` | DynamoDB `OPS#ANALYTICS` |
| `product.scanned.v1` | `product-service` | `labellens-analytics-queue` | `analytics-worker` | DynamoDB `OPS#ANALYTICS` |
| `menu.saved.v1` | `menu-service` | `labellens-analytics-queue` | `analytics-worker` | DynamoDB `OPS#ANALYTICS` |
| `favorite.saved.v1` | `favorites-service` | `labellens-analytics-queue` | `analytics-worker` | DynamoDB `OPS#ANALYTICS` |

Validación:

```powershell
npm run local:analytics:smoke
```

El smoke publica los cuatro eventos pasando por gateway y verifica que el worker los registre en DynamoDB.
