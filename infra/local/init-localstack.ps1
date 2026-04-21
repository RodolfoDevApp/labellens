$ErrorActionPreference = "Stop"

if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
  $global:PSNativeCommandUseErrorActionPreference = $false
}

$localstackPort = $env:LABEL_LENS_LOCALSTACK_PORT
if (-not $localstackPort) {
  $localstackPort = "4566"
}

$endpoint = $env:AWS_ENDPOINT_URL
if (-not $endpoint) {
  $endpoint = "http://localhost:$localstackPort"
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

function Invoke-AwsCliTextAllowFailure {
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
    return $null
  }

  return $output
}

function Test-TableExists {
  $query = "TableNames[?@=='$tableName'] | [0]"

  $result = Invoke-AwsCliText -CliArgs @(
    "dynamodb", "list-tables",
    "--query", $query,
    "--output", "text"
  )

  return (-not [string]::IsNullOrWhiteSpace($result)) -and $result -ne "None"
}

function Ensure-Table {
  Write-Host "Ensuring DynamoDB table $tableName..."

  if (-not (Test-TableExists)) {
    Write-Host "Creating DynamoDB table $tableName..."

    Invoke-AwsCliText -CliArgs @(
      "dynamodb", "create-table",
      "--table-name", $tableName,
      "--attribute-definitions", "AttributeName=PK,AttributeType=S", "AttributeName=SK,AttributeType=S",
      "--key-schema", "AttributeName=PK,KeyType=HASH", "AttributeName=SK,KeyType=RANGE",
      "--billing-mode", "PAY_PER_REQUEST"
    ) | Out-Null
  }

  Invoke-AwsCliText -CliArgs @(
    "dynamodb", "wait", "table-exists",
    "--table-name", $tableName
  ) | Out-Null

  Invoke-AwsCliText -CliArgs @(
    "dynamodb", "update-time-to-live",
    "--table-name", $tableName,
    "--time-to-live-specification", "Enabled=true,AttributeName=expiresAt"
  ) | Out-Null
}

function Get-QueueUrlOrNull {
  param(
    [Parameter(Mandatory = $true)]
    [string] $QueueName
  )

  $queueUrl = Invoke-AwsCliTextAllowFailure -CliArgs @(
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

function Ensure-Queue {
  param(
    [Parameter(Mandatory = $true)]
    [string] $QueueName
  )

  $queueUrl = Get-QueueUrlOrNull -QueueName $QueueName

  if ($queueUrl) {
    return $queueUrl
  }

  Write-Host "Creating SQS queue $QueueName..."

  $createdQueueUrl = Invoke-AwsCliText -CliArgs @(
    "sqs", "create-queue",
    "--queue-name", $QueueName,
    "--query", "QueueUrl",
    "--output", "text"
  )

  if ([string]::IsNullOrWhiteSpace($createdQueueUrl) -or $createdQueueUrl -eq "None") {
    throw "SQS queue $QueueName was not created."
  }

  return $createdQueueUrl.Trim()
}

function Get-QueueArn {
  param(
    [Parameter(Mandatory = $true)]
    [string] $QueueUrl
  )

  $queueArn = Invoke-AwsCliText -CliArgs @(
    "sqs", "get-queue-attributes",
    "--queue-url", $QueueUrl,
    "--attribute-names", "QueueArn",
    "--query", "Attributes.QueueArn",
    "--output", "text"
  )

  if ([string]::IsNullOrWhiteSpace($queueArn) -or $queueArn -eq "None") {
    throw "Could not read QueueArn for $QueueUrl."
  }

  return $queueArn.Trim()
}

function Set-RedrivePolicy {
  param(
    [Parameter(Mandatory = $true)]
    [string] $QueueUrl,

    [Parameter(Mandatory = $true)]
    [string] $DlqArn,

    [Parameter(Mandatory = $true)]
    [int] $MaxReceiveCount
  )

  $redrivePolicy = @{
    deadLetterTargetArn = $DlqArn
    maxReceiveCount = "$MaxReceiveCount"
  } | ConvertTo-Json -Compress

  $cliInput = @{
    QueueUrl = $QueueUrl
    Attributes = @{
      RedrivePolicy = $redrivePolicy
    }
  } | ConvertTo-Json -Depth 5

  $tempFile = Join-Path $env:TEMP ("labellens-sqs-redrive-{0}.json" -f ([Guid]::NewGuid().ToString("N")))

  try {
    Set-Content -Path $tempFile -Value $cliInput -Encoding ascii

    $fileUri = "file://$($tempFile.Replace('\', '/'))"

    Invoke-AwsCliText -CliArgs @(
      "sqs", "set-queue-attributes",
      "--cli-input-json", $fileUri
    ) | Out-Null
  } finally {
    if (Test-Path $tempFile) {
      Remove-Item -Force $tempFile
    }
  }
}

function Ensure-QueueWithDlq {
  param(
    [Parameter(Mandatory = $true)]
    [string] $QueueName,

    [Parameter(Mandatory = $true)]
    [string] $DlqName,

    [Parameter(Mandatory = $true)]
    [int] $MaxReceiveCount
  )

  Write-Host "Ensuring SQS queue $QueueName with DLQ $DlqName..."

  $dlqUrl = Ensure-Queue -QueueName $DlqName
  $queueUrl = Ensure-Queue -QueueName $QueueName
  $dlqArn = Get-QueueArn -QueueUrl $dlqUrl

  Set-RedrivePolicy `
    -QueueUrl $queueUrl `
    -DlqArn $dlqArn `
    -MaxReceiveCount $MaxReceiveCount
}

Ensure-Table

Ensure-QueueWithDlq `
  -QueueName "labellens-product-not-found-queue" `
  -DlqName "labellens-product-not-found-dlq" `
  -MaxReceiveCount 3

Ensure-QueueWithDlq `
  -QueueName "labellens-analytics-queue" `
  -DlqName "labellens-analytics-dlq" `
  -MaxReceiveCount 3

Ensure-QueueWithDlq `
  -QueueName "labellens-food-cache-refresh-queue" `
  -DlqName "labellens-food-cache-refresh-dlq" `
  -MaxReceiveCount 3

Ensure-QueueWithDlq `
  -QueueName "labellens-product-cache-refresh-queue" `
  -DlqName "labellens-product-cache-refresh-dlq" `
  -MaxReceiveCount 3

Write-Host "LocalStack resources ready: $tableName, sealed SQS queues, DLQs and redrive policies."