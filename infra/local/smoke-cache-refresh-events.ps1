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

$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_DEFAULT_REGION = $region

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI was not found. Install AWS CLI v2 or make sure 'aws' is available in PATH."
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
  $queueUrl = Invoke-AwsCliText -CliArgs @("sqs", "get-queue-url", "--queue-name", $QueueName, "--query", "QueueUrl", "--output", "text")
  if ([string]::IsNullOrWhiteSpace($queueUrl) -or $queueUrl -eq "None") {
    throw "SQS queue $QueueName does not exist. Run npm run local:init."
  }
  return $queueUrl.Trim()
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
  $message = @{
    eventId = [Guid]::NewGuid().ToString()
    eventType = $EventType
    eventVersion = 1
    occurredAt = (Get-Date).ToUniversalTime().ToString("o")
    correlationId = $correlationId
    producer = "eventbridge-scheduler"
    payload = @{ target = $Target; scheduledFor = $scheduledFor; limit = 50 }
  } | ConvertTo-Json -Depth 8 -Compress
  Invoke-AwsCliText -CliArgs @("sqs", "send-message", "--queue-url", $queueUrl, "--message-body", $message, "--message-attributes", "eventType={DataType=String,StringValue=$EventType},eventVersion={DataType=Number,StringValue=1},producer={DataType=String,StringValue=eventbridge-scheduler},correlationId={DataType=String,StringValue=$correlationId}") | Out-Null
  Write-Host "Published $EventType to $QueueName."
}

Send-Event -QueueName "labellens-food-cache-refresh-queue" -EventType "cache.refresh.food.requested.v1" -Target "food"
Send-Event -QueueName "labellens-product-cache-refresh-queue" -EventType "cache.refresh.product.requested.v1" -Target "product"
Write-Host "Cache refresh scheduler-style messages published."
