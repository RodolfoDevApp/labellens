$ErrorActionPreference = "Stop"

$endpoint = $env:AWS_ENDPOINT_URL
if (-not $endpoint) {
  $endpoint = "http://localhost:4566"
}

$region = $env:AWS_REGION
if (-not $region) {
  $region = "us-east-1"
}

$tableName = $env:LABEL_LENS_TABLE
if (-not $tableName) {
  $tableName = "LabelLensTable"
}

$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"

function Invoke-AwsCli {
  param([string[]] $Args)
  aws @Args --endpoint-url $endpoint --region $region
}

try {
  Invoke-AwsCli @("dynamodb", "describe-table", "--table-name", $tableName) | Out-Null
} catch {
  Invoke-AwsCli @(
    "dynamodb", "create-table",
    "--table-name", $tableName,
    "--attribute-definitions", "AttributeName=PK,AttributeType=S", "AttributeName=SK,AttributeType=S",
    "--key-schema", "AttributeName=PK,KeyType=HASH", "AttributeName=SK,KeyType=RANGE",
    "--billing-mode", "PAY_PER_REQUEST"
  ) | Out-Null
}

Invoke-AwsCli @(
  "dynamodb", "update-time-to-live",
  "--table-name", $tableName,
  "--time-to-live-specification", "Enabled=true,AttributeName=expiresAt"
) | Out-Null

$queues = @(
  "labellens-product-not-found-dlq",
  "labellens-analytics-dlq",
  "labellens-product-not-found-queue",
  "labellens-analytics-queue"
)

foreach ($queue in $queues) {
  try {
    Invoke-AwsCli @("sqs", "get-queue-url", "--queue-name", $queue) | Out-Null
  } catch {
    Invoke-AwsCli @("sqs", "create-queue", "--queue-name", $queue) | Out-Null
  }
}

Write-Host "LocalStack resources ready: $tableName and SQS queues."
