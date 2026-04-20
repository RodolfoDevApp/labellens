# Local development

Local development has two storage modes. The default local enterprise path is Docker Compose with LocalStack and DynamoDB. In-memory mode stays only for fast tests and isolated development.

## In-memory mode

Use this for fast unit/API tests.

```powershell
$env:STORAGE_DRIVER="in-memory"
npm run dev:api
```

Data is lost when the process restarts. Do not use this mode to claim persistence is working.

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
STORAGE_DRIVER=dynamodb
AWS_ENDPOINT_URL=http://localstack:4566
LABEL_LENS_TABLE=LabelLensTable
```

The health endpoint must report `storageDriver: "dynamodb"` when Docker Compose is the active local backend.

## Port conflicts

Docker Compose uses configurable host ports. If another process is using `3000`, `4000`, `4566` or `8001`, set explicit ports before running Compose:

```powershell
$env:LABEL_LENS_WEB_PORT="3001"
$env:LABEL_LENS_API_PORT="4000"
$env:LABEL_LENS_LOCALSTACK_PORT="4566"
$env:LABEL_LENS_DYNAMODB_ADMIN_PORT="8002"
npm run compose:up
```

The web container still listens on port `3000` internally. `NEXT_PUBLIC_API_BASE_URL` points to the configured API host port.

## Verify local enterprise resources

Run this after Compose starts:

```powershell
npm run local:resources:check
```

The check fails unless all of these are true:

1. `/api/v1/health` returns `status: "ok"`.
2. `/api/v1/health` returns `storageDriver: "dynamodb"`.
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

1. Calls `/api/v1/health` and requires `storageDriver=dynamodb`.
2. Logs in through `/api/v1/auth/demo-login`.
3. Saves one menu and one favorite through the public HTTP API.
4. Restarts only the API container.
5. Logs in again.
6. Lists menus and favorites.
7. Fails if the saved menu or favorite disappeared.
8. Deletes the smoke data unless `-KeepData` is passed directly to the script.

Keep the smoke data for inspection:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\local\smoke-local-persistence.ps1 -KeepData
```

## Useful logs

```powershell
npm run compose:logs:api
npm run compose:logs:web
npm run compose:logs:localstack
```
