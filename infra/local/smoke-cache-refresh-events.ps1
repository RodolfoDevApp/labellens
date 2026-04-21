param(
  [string] $BaseUrl = ""
)

$ErrorActionPreference = "Stop"

if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
  $global:PSNativeCommandUseErrorActionPreference = $false
}

$localstackPort = $env:LABEL_LENS_LOCALSTACK_PORT
if (-not $localstackPort) { $localstackPort = "4566" }

$gatewayPort = $env:LABEL_LENS_GATEWAY_PORT
if (-not $gatewayPort) { $gatewayPort = "4000" }

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = "http://localhost:$gatewayPort"
}

$endpoint = $env:AWS_ENDPOINT_URL
if (-not $endpoint) { $endpoint = "http://localhost:$localstackPort" }

$region = $env:AWS_REGION
if (-not $region) { $region = "us-east-1" }

$tableName = $env:LABEL_LENS_TABLE
if (-not $tableName) { $tableName = "LabelLensTable" }

$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_DEFAULT_REGION = $region

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI was not found. Install AWS CLI v2 or make sure 'aws' is available in PATH."
}

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

  if ([string]::IsNullOrWhiteSpace($output)) {
    return $null
  }

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

function Invoke-ApiJson {
  param(
    [ValidateSet("GET", "POST")][string] $Method,
    [string] $Path,
    [hashtable] $Headers = @{}
  )

  return Invoke-RestMethod -Method $Method -Uri "$BaseUrl$Path" -Headers $Headers
}

function Get-QueueUrl {
  param([Parameter(Mandatory = $true)][string] $QueueName)

  $queueUrl = Invoke-AwsCliText -CliArgs @(
    "sqs",
    "get-queue-url",
    "--queue-name",
    $QueueName,
    "--query",
    "QueueUrl",
    "--output",
    "text"
  )

  if ([string]::IsNullOrWhiteSpace($queueUrl) -or $queueUrl -eq "None") {
    throw "SQS queue $QueueName does not exist. Run npm run local:init."
  }

  return $queueUrl.Trim()
}

function Get-CacheUpdatedAt {
  param(
    [Parameter(Mandatory = $true)][string] $Pk,
    [Parameter(Mandatory = $true)][string] $Sk
  )

  $key = @{
    PK = @{ S = $Pk }
    SK = @{ S = $Sk }
  } | ConvertTo-Json -Depth 5 -Compress

  $tempFile = Join-Path $env:TEMP ("labellens-cache-key-{0}.json" -f ([Guid]::NewGuid().ToString("N")))

  try {
    Set-Content -Path $tempFile -Value $key -Encoding ascii
    $fileUri = "file://$($tempFile.Replace('\', '/'))"

    $result = Invoke-AwsCliJson -CliArgs @(
      "dynamodb",
      "get-item",
      "--table-name",
      $tableName,
      "--key",
      $fileUri
    )

    if (-not $result.Item -or -not $result.Item.updatedAt -or -not $result.Item.updatedAt.S) {
      throw "Cache item $Pk/$Sk does not exist or has no updatedAt."
    }

    return $result.Item.updatedAt.S
  } finally {
    if (Test-Path $tempFile) {
      Remove-Item -Force $tempFile
    }
  }
}

function Send-Event {
  param(
    [Parameter(Mandatory = $true)][string] $QueueName,
    [Parameter(Mandatory = $true)][string] $EventType,
    [Parameter(Mandatory = $true)][string] $Target
  )

  $queueUrl = Get-QueueUrl -QueueName $QueueName
  $scheduledFor = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")
  $correlationId = "local-scheduler-$([Guid]::NewGuid().ToString('N'))"
  $eventId = [Guid]::NewGuid().ToString()

  $messageBody = @{
    eventId = $eventId
    eventType = $EventType
    eventVersion = 1
    occurredAt = (Get-Date).ToUniversalTime().ToString("o")
    correlationId = $correlationId
    producer = "eventbridge-scheduler"
    payload = @{
      target = $Target
      scheduledFor = $scheduledFor
      limit = 50
    }
  } | ConvertTo-Json -Depth 8 -Compress

  $sendMessageInput = @{
    QueueUrl = $queueUrl
    MessageBody = $messageBody
    MessageAttributes = @{
      eventType = @{
        DataType = "String"
        StringValue = $EventType
      }
      eventVersion = @{
        DataType = "Number"
        StringValue = "1"
      }
      producer = @{
        DataType = "String"
        StringValue = "eventbridge-scheduler"
      }
      correlationId = @{
        DataType = "String"
        StringValue = $correlationId
      }
    }
  } | ConvertTo-Json -Depth 20 -Compress

  $tempFile = Join-Path $env:TEMP ("labellens-cache-refresh-send-message-{0}.json" -f ([Guid]::NewGuid().ToString("N")))

  try {
    Set-Content -Path $tempFile -Value $sendMessageInput -Encoding ascii
    $fileUri = "file://$($tempFile.Replace('\', '/'))"

    Invoke-AwsCliJson -CliArgs @(
      "sqs",
      "send-message",
      "--cli-input-json",
      $fileUri
    ) | Out-Null
  } finally {
    if (Test-Path $tempFile) {
      Remove-Item -Force $tempFile
    }
  }

  Write-Host "Published $EventType to $QueueName."
  return $eventId
}

Write-Host "Priming food and product detail caches through gateway..."
Invoke-ApiJson -Method GET -Path "/api/v1/foods/168874" | Out-Null
Invoke-ApiJson -Method GET -Path "/api/v1/products/barcode/3017624010701" | Out-Null

$foodUpdatedAtBefore = Get-CacheUpdatedAt -Pk "FOOD#USDA#168874" -Sk "DETAIL"
$productUpdatedAtBefore = Get-CacheUpdatedAt -Pk "PRODUCT#OFF#3017624010701" -Sk "DETAIL"

Start-Sleep -Seconds 1

$foodEventId = Send-Event -QueueName "labellens-food-cache-refresh-queue" -EventType "cache.refresh.food.requested.v1" -Target "food"
$productEventId = Send-Event -QueueName "labellens-product-cache-refresh-queue" -EventType "cache.refresh.product.requested.v1" -Target "product"

Write-Host "Waiting for cache refresh workers to consume messages and refresh cached details..."

for ($attempt = 1; $attempt -le 60; $attempt++) {
  $foodUpdatedAtAfter = Get-CacheUpdatedAt -Pk "FOOD#USDA#168874" -Sk "DETAIL"
  $productUpdatedAtAfter = Get-CacheUpdatedAt -Pk "PRODUCT#OFF#3017624010701" -Sk "DETAIL"

  if ($foodUpdatedAtAfter -ne $foodUpdatedAtBefore -and $productUpdatedAtAfter -ne $productUpdatedAtBefore) {
    Write-Host "Cache refresh workers verified. Events $foodEventId and $productEventId refreshed cached food/product details."
    exit 0
  }

  Start-Sleep -Seconds 1
}

throw "Timed out waiting for cache refresh workers to refresh cached details. Check food-cache-refresh-worker, product-cache-refresh-worker and service logs."