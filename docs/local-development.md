# Local development

Local development has two storage modes.

## In-memory mode

Use this for fast unit/API tests.

```powershell
$env:STORAGE_DRIVER="in-memory"
npm run dev:api
```

Data is lost when the process restarts.

## DynamoDB LocalStack mode

Use this when validating real persistence.

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

Manual resource initialization from Windows is available with:

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\local\init-localstack.ps1
```
