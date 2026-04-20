$ErrorActionPreference = "Stop"

if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
  $global:PSNativeCommandUseErrorActionPreference = $false
}

$localstackPort = $env:LABEL_LENS_LOCALSTACK_PORT
if (-not $localstackPort) {
  $localstackPort = "4566"
}

$apiPort = $env:LABEL_LENS_API_PORT
if (-not $apiPort) {
  $apiPort = "4000"
}

$endpoint = $env:AWS_ENDPOINT_URL
if (-not $endpoint) {
  $endpoint = "http://localhost:$localstackPort"
}

$apiBaseUrl = $env:LABEL_LENS_API_BASE_URL
if (-not $apiBaseUrl) {
  $apiBaseUrl = "http://localhost:$apiPort"
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
$env:AWS_DEFAULT_REGION = $region

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI was not found. Install AWS CLI v2 or make sure 'aws' is available in PATH."
}

function Invoke-AwsCliJson {
  param(
    [Parameter(Mandatory = $true)]
    [string[]] $CliArgs
  )

  $fullArgs = @("--endpoint-url", $endpoint, "--region", $region, "--output", "json") + $CliArgs

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"

  try {
    $raw = & aws @fullArgs 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  $output = ($raw | ForEach-Object { $_.ToString() } | Out-String).Trim()

  if ($exitCode -ne 0) {
    throw ("AWS CLI command failed with exit code {0}: aws {1}`n{2}" -f $exitCode, ($fullArgs -join " "), $output)
  }

  if ([string]::IsNullOrWhiteSpace($output)) {
    return $null
  }

  return $output | ConvertFrom-Json
}

function Invoke-AwsCliText {
  param(
    [Parameter(Mandatory = $true)]
    [string[]] $CliArgs
  )

  $fullArgs = @("--endpoint-url", $endpoint, "--region", $region) + $CliArgs

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"

  try {
    $raw = & aws @fullArgs 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  $output = ($raw | ForEach-Object { $_.ToString() } | Out-String).Trim()

  if ($exitCode -ne 0) {
    throw ("AWS CLI command failed with exit code {0}: aws {1}`n{2}" -f $exitCode, ($fullArgs -join " "), $output)
  }

  return $output
}

function Get-QueueUrlOrNull {
  param(
    [Parameter(Mandatory = $true)]
    [string] $QueueName
  )

  $queueUrl = Invoke-AwsCliText -CliArgs @(
    "sqs", "list-queues",
    "--queue-name-prefix", $QueueName,
    "--query", "QueueUrls[0]",
    "--output", "text"
  )

  if ([string]::IsNullOrWhiteSpace($queueUrl) -or $queueUrl -eq "None") {
    return $null
  }

  return $queueUrl.Trim()
}

function Get-RequiredQueueUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string] $QueueName
  )

  $queueUrl = Get-QueueUrlOrNull -QueueName $QueueName

  if (-not $queueUrl) {
    throw "SQS queue $QueueName does not exist."
  }

  return $queueUrl
}

function Assert-QueueExists {
  param(
    [Parameter(Mandatory = $true)]
    [string] $QueueName
  )

  Get-RequiredQueueUrl -QueueName $QueueName | Out-Null
}

function Assert-QueueRedrivePolicy {
  param(
    [Parameter(Mandatory = $true)]
    [string] $QueueName,

    [Parameter(Mandatory = $true)]
    [string] $ExpectedDlqName,

    [Parameter(Mandatory = $true)]
    [string] $ExpectedMaxReceiveCount
  )

  $queueUrl = Get-RequiredQueueUrl -QueueName $QueueName

  $attributes = Invoke-AwsCliJson -CliArgs @(
    "sqs", "get-queue-attributes",
    "--queue-url", $queueUrl,
    "--attribute-names", "QueueArn", "RedrivePolicy"
  )

  if (-not $attributes.Attributes.RedrivePolicy) {
    throw "Queue $QueueName is missing RedrivePolicy."
  }

  $redrive = $attributes.Attributes.RedrivePolicy | ConvertFrom-Json

  if ("$($redrive.maxReceiveCount)" -ne "$ExpectedMaxReceiveCount") {
    throw "Queue $QueueName expected maxReceiveCount=$ExpectedMaxReceiveCount but got $($redrive.maxReceiveCount)."
  }

  if ($redrive.deadLetterTargetArn -notlike "*$ExpectedDlqName") {
    throw "Queue $QueueName expected DLQ $ExpectedDlqName but got $($redrive.deadLetterTargetArn)."
  }
}

Write-Host "Checking API health at $apiBaseUrl/api/v1/health..."
$health = Invoke-RestMethod -Uri "$apiBaseUrl/api/v1/health" -Method Get

if ($health.status -ne "ok") {
  throw "Health endpoint status is not ok."
}

if ($health.storageDriver -ne "dynamodb") {
  throw "Expected storageDriver=dynamodb but got $($health.storageDriver)."
}

Write-Host "Checking DynamoDB table $tableName at $endpoint..."
$table = Invoke-AwsCliJson -CliArgs @(
  "dynamodb", "describe-table",
  "--table-name", $tableName
)

if ($table.Table.TableStatus -ne "ACTIVE") {
  throw "DynamoDB table $tableName is not ACTIVE."
}

$ttl = Invoke-AwsCliJson -CliArgs @(
  "dynamodb", "describe-time-to-live",
  "--table-name", $tableName
)

if ($ttl.TimeToLiveDescription.AttributeName -ne "expiresAt") {
  throw "DynamoDB TTL attribute must be expiresAt."
}

if ($ttl.TimeToLiveDescription.TimeToLiveStatus -ne "ENABLED") {
  throw "DynamoDB TTL must be ENABLED."
}

Write-Host "Checking SQS queues and redrive policies..."

Assert-QueueExists -QueueName "labellens-product-not-found-dlq"
Assert-QueueExists -QueueName "labellens-analytics-dlq"

Assert-QueueRedrivePolicy `
  -QueueName "labellens-product-not-found-queue" `
  -ExpectedDlqName "labellens-product-not-found-dlq" `
  -ExpectedMaxReceiveCount "3"

Assert-QueueRedrivePolicy `
  -QueueName "labellens-analytics-queue" `
  -ExpectedDlqName "labellens-analytics-dlq" `
  -ExpectedMaxReceiveCount "5"

Write-Host "Local enterprise resources verified: API health, DynamoDB table, TTL, SQS queues and DLQ redrive policies."