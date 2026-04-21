$ErrorActionPreference = "Stop"

if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
  $global:PSNativeCommandUseErrorActionPreference = $false
}

$localstackPort = $env:LABEL_LENS_LOCALSTACK_PORT
if (-not $localstackPort) { $localstackPort = "4566" }

$endpoint = $env:AWS_ENDPOINT_URL
if (-not $endpoint) { $endpoint = "http://localhost:$localstackPort" }

$region = $env:AWS_REGION
if (-not $region) { $region = "us-east-1" }

$tableName = $env:LABEL_LENS_TABLE
if (-not $tableName) { $tableName = "LabelLensTable" }

$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_DEFAULT_REGION = $region

function Invoke-AwsCliJson {
  param([Parameter(Mandatory = $true)][string[]] $CliArgs)
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
  if ([string]::IsNullOrWhiteSpace($output)) { return $null }
  return $output | ConvertFrom-Json
}

function Invoke-AwsCliText {
  param([Parameter(Mandatory = $true)][string[]] $CliArgs)
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

function Get-QueueUrl {
  param([Parameter(Mandatory = $true)][string] $QueueName)
  return (Invoke-AwsCliText -CliArgs @("sqs", "get-queue-url", "--queue-name", $QueueName, "--query", "QueueUrl", "--output", "text")).Trim()
}

function Find-DlqRecord {
  param([string] $MessageId)
  $attributeValues = @{
    ":pk" = @{ S = "OPS#DLQ#" }
    ":messageId" = @{ S = $MessageId }
  } | ConvertTo-Json -Depth 5
  $tempFile = Join-Path $env:TEMP ("labellens-dlq-scan-{0}.json" -f ([Guid]::NewGuid().ToString("N")))
  try {
    Set-Content -Path $tempFile -Value $attributeValues -Encoding ascii
    $fileUri = "file://$($tempFile.Replace('\', '/'))"
    return Invoke-AwsCliJson -CliArgs @(
      "dynamodb", "scan",
      "--table-name", $tableName,
      "--filter-expression", "PK = :pk AND messageId = :messageId",
      "--expression-attribute-values", $fileUri
    )
  } finally {
    if (Test-Path $tempFile) { Remove-Item -Force $tempFile }
  }
}

$queueUrl = Get-QueueUrl -QueueName "labellens-analytics-dlq"
$messageBody = @{
  eventId = [Guid]::NewGuid().ToString()
  eventType = "food.searched.v1"
  eventVersion = 1
  occurredAt = (Get-Date).ToUniversalTime().ToString("o")
  correlationId = "dlq-smoke-$([Guid]::NewGuid().ToString('N'))"
  producer = "food-service"
  payload = @{ query = "oats"; queryUsed = "oats"; sourceMode = "fixture"; resultCount = 1 }
} | ConvertTo-Json -Depth 8 -Compress

Write-Host "Publishing a message directly to labellens-analytics-dlq for dlq-handler smoke..."
$result = Invoke-AwsCliJson -CliArgs @("sqs", "send-message", "--queue-url", $queueUrl, "--message-body", $messageBody)
$messageId = $result.MessageId

Write-Host "Waiting for dlq-handler to record message $messageId in DynamoDB..."
for ($attempt = 1; $attempt -le 60; $attempt++) {
  $record = Find-DlqRecord -MessageId $messageId
  if ($record.Count -gt 0) {
    Write-Host "DLQ handler verified. Message $messageId was recorded in DynamoDB under OPS#DLQ#."
    exit 0
  }
  Start-Sleep -Seconds 1
}

throw "Timed out waiting for dlq-handler to record message $messageId. Check dlq-handler and LocalStack logs."
