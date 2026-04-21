# Local development

Local development has two storage modes. The default local enterprise path is Docker Compose with a public gateway, private API service, LocalStack and DynamoDB. In-memory mode stays only for fast tests and isolated development.

## In-memory mode

Use this for fast unit/API tests when running the API by itself.

```powershell
$env:STORAGE_DRIVER="in-memory"
npm run dev:api
```

Data is lost when the process restarts. Do not use this mode to claim persistence is working.

## Gateway-first local mode

Docker Compose now uses this boundary:

```txt
Browser / Next.js PWA
  -> gateway :4000
     -> api :4100 inside docker network only
        -> LocalStack :4566
           -> DynamoDB LabelLensTable
           -> SQS queues and DLQs
```

The browser must use the gateway URL. It must not call the API container directly.

```txt
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

The API service is private to the Compose network. It is exposed to the gateway on container port `4100` and is not published as a host port.

## DynamoDB LocalStack mode

Use this when validating real local persistence.

```powershell
npm run compose:up
npm run local:resources:check
```

The LocalStack ready hook creates and configures:

- DynamoDB table `LabelLensTable`
- DynamoDB TTL on attribute `expiresAt`
- SQS queue `labellens-product-not-found-queue`
- SQS queue `labellens-analytics-queue`
- SQS DLQ `labellens-product-not-found-dlq`
- SQS DLQ `labellens-analytics-dlq`
- Redrive policy: `product-not-found` -> `product-not-found-dlq`, max receive count `3`
- Redrive policy: `analytics` -> `analytics-dlq`, max receive count `5`

The API container runs with:

```txt
PORT=4100
STORAGE_DRIVER=dynamodb
AWS_ENDPOINT_URL=http://localstack:4566
LABEL_LENS_TABLE=LabelLensTable
```

The gateway container runs with:

```txt
PORT=4000
LABEL_LENS_API_INTERNAL_URL=http://api:4100
```

The public health check goes through the gateway:

```txt
GET http://localhost:4000/api/v1/health
```

It must report `storageDriver: "dynamodb"` when Docker Compose is the active local backend.

## Port conflicts

Docker Compose uses configurable host ports. If another process is using `3000`, `4000`, `4566` or `8001`, set explicit ports before running Compose:

```powershell
$env:LABEL_LENS_WEB_PORT="3001"
$env:LABEL_LENS_GATEWAY_PORT="4001"
$env:LABEL_LENS_LOCALSTACK_PORT="4566"
$env:LABEL_LENS_DYNAMODB_ADMIN_PORT="8002"
npm run compose:up
```

The web container still listens on port `3000` internally. `NEXT_PUBLIC_API_BASE_URL` points to the configured gateway host port.

## Verify local enterprise resources

Run this after Compose starts:

```powershell
npm run local:resources:check
```

The check fails unless all of these are true:

1. Gateway `/api/v1/health` returns `status: "ok"`.
2. Gateway `/api/v1/health` returns `storageDriver: "dynamodb"` from the private API service.
3. DynamoDB table `LabelLensTable` exists and is `ACTIVE`.
4. DynamoDB TTL is configured on `expiresAt`.
5. Product-not-found and analytics queues exist.
6. Product-not-found and analytics DLQs exist.
7. Source queues have the expected DLQ redrive policies.

## Manual resource initialization

Manual resource initialization from Windows is available with:

```powershell
npm run local:init
```

This requires AWS CLI installed locally. Docker Compose also runs the LocalStack ready hook automatically.

## Prove persistence survives API restart

Run the smoke test after `npm run compose:up`:

```powershell
npm run local:persistence:smoke
```

The smoke test:

1. Calls gateway `/api/v1/health` and requires `storageDriver=dynamodb`.
2. Logs in through gateway `/api/v1/auth/demo-login`.
3. Saves one menu and one favorite through the public gateway HTTP API.
4. Restarts only the private API container.
5. Waits for gateway `/api/v1/health` to become healthy again.
6. Logs in again through the gateway.
7. Lists menus and favorites through the gateway.
8. Fails if the saved menu or favorite disappeared.
9. Deletes the smoke data unless `-KeepData` is passed directly to the script.

Keep the smoke data for inspection:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\local\smoke-local-persistence.ps1 -KeepData
```

## Useful logs

```powershell
npm run compose:logs:gateway
npm run compose:logs:api
npm run compose:logs:web
npm run compose:logs:localstack
```
