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
```

The LocalStack ready hook creates:

- DynamoDB table `LabelLensTable`
- SQS queue `labellens-product-not-found-queue`
- SQS queue `labellens-analytics-queue`
- SQS DLQ `labellens-product-not-found-dlq`
- SQS DLQ `labellens-analytics-dlq`

The API container runs with:

```txt
STORAGE_DRIVER=dynamodb
AWS_ENDPOINT_URL=http://localstack:4566
LABEL_LENS_TABLE=LabelLensTable
```

The health endpoint must report `storageDriver: "dynamodb"` when Docker Compose is the active local backend.

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
npm run compose:logs:localstack
```
