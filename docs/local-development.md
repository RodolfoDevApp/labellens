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
- The four sealed SQS queues and four DLQs exist.
- Redrive policies are configured with max receive count `3`.

`local:persistence:smoke` saves a menu and favorite through the gateway, restarts `menu-service` and `favorites-service`, then reads the data again through the gateway. If the data survives, persistence is outside process memory.

## Build and test

```powershell
npm run build:domain
npm run build:contracts
npm run build -w @labellens/application
npm run build:infrastructure
npm run build:services
npm run build:gateway
npm run build:workers
npm run test:services
npm run test:gateway
npm run test:workers
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
npm run compose:logs:product-not-found-worker
npm run compose:logs:analytics-worker
npm run compose:logs:food-cache-refresh-worker
npm run compose:logs:product-cache-refresh-worker
npm run compose:logs:dlq-handler
npm run compose:logs:localstack
```

## Phase 7 local messaging smoke

Phase 7 uses real local messaging for operational async events.

Runtime paths:

```txt
product-service -> SQS labellens-product-not-found-queue -> product-not-found-worker -> DynamoDB LabelLensTable
food/menu/product/favorites services -> SQS labellens-analytics-queue -> analytics-worker -> DynamoDB LabelLensTable
EventBridge-style message -> SQS labellens-food-cache-refresh-queue -> food-cache-refresh-worker -> food-service internal refresh -> DynamoDB cache
EventBridge-style message -> SQS labellens-product-cache-refresh-queue -> product-cache-refresh-worker -> product-service internal refresh -> DynamoDB cache
DLQ queues -> dlq-handler -> DynamoDB OPS#DLQ#
```

The public browser boundary remains the gateway. The cache refresh workers call private service routes only inside the Docker network:

```txt
POST /internal/cache/refresh/food
POST /internal/cache/refresh/product
```

Those routes are not exposed through the gateway.

Verify the local event flow with:

```powershell
npm run compose:up
npm run local:resources:check
npm run local:events:smoke
npm run local:analytics:smoke
npm run local:cache-refresh:smoke
npm run local:dlq:smoke
```

`local:cache-refresh:smoke` primes food/product detail cache through the gateway, publishes scheduler-style refresh messages to the refresh queues, and verifies the refresh workers updated the cached detail records.

`local:dlq:smoke` publishes a controlled message directly to a DLQ and verifies `dlq-handler` records it under `PK=OPS#DLQ#`.

## Production-style container checks

The local compose stack remains a development runtime: it mounts the repository and runs `dev:*` scripts. Phase 8B adds a separate production-style container foundation for the AWS/ECR path.

Run the static container check without needing AWS:

```powershell
npm run containers:check
```

Build a single local production image when Docker is available:

```powershell
npm run containers:build -- -Image gateway -Tag local
```
