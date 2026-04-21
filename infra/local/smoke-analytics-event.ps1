param(
  [string] $BaseUrl = ""
)

$ErrorActionPreference = "Stop"

if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
  $global:PSNativeCommandUseErrorActionPreference = $false
}

$localstackPort = $env:LABEL_LENS_LOCALSTACK_PORT
if (-not $localstackPort) {
  $localstackPort = "4566"
}

$gatewayPort = $env:LABEL_LENS_GATEWAY_PORT
if (-not $gatewayPort) {
  $gatewayPort = "4000"
}

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = "http://localhost:$gatewayPort"
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

function Convert-ToJsonBody {
  param([object] $Value)

  return $Value | ConvertTo-Json -Depth 40 -Compress
}

function Invoke-ApiJson {
  param(
    [ValidateSet("GET", "POST", "PUT", "DELETE")]
    [string] $Method,
    [string] $Path,
    [object] $Body = $null,
    [hashtable] $Headers = @{}
  )

  $uri = "$BaseUrl$Path"
  $requestHeaders = @{}

  foreach ($key in $Headers.Keys) {
    $requestHeaders[$key] = $Headers[$key]
  }

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $requestHeaders
  }

  return Invoke-RestMethod `
    -Method $Method `
    -Uri $uri `
    -Headers $requestHeaders `
    -ContentType "application/json" `
    -Body (Convert-ToJsonBody $Body)
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

function New-NutritionFacts {
  return @{
    energyKcalPer100g = 389
    proteinGPer100g = 16.89
    carbsGPer100g = 66.27
    fatGPer100g = 6.9
    sugarGPer100g = 0.99
    fiberGPer100g = 10.6
    sodiumMgPer100g = 2
    source = "USDA"
    sourceId = "168874"
    lastFetchedAt = "2026-04-18T00:00:00.000Z"
    completeness = "COMPLETE"
  }
}

function New-MenuPayload {
  param([string] $RunId)

  return @{
    name = "Analytics smoke $RunId"
    date = "2026-04-19"
    meals = @(
      @{
        type = "breakfast"
        items = @(
          @{
            id = "analytics-item-$RunId"
            source = "USDA"
            sourceId = "168874"
            displayName = "Oats, raw"
            grams = 40
            nutrition = New-NutritionFacts
          }
        )
      },
      @{ type = "lunch"; items = @() },
      @{ type = "dinner"; items = @() },
      @{ type = "snack"; items = @() }
    )
  }
}

function New-FavoritePayload {
  return @{
    source = "USDA"
    sourceId = "168874"
    displayName = "Oats, raw"
    grams = 40
    nutrition = New-NutritionFacts
  }
}

function Find-AnalyticsEventsByCorrelationIds {
  param([string[]] $CorrelationIds)

  $attributeValues = @{
    ":pk" = @{ S = "OPS#ANALYTICS" }
  }
  $correlationFilters = @()

  for ($index = 0; $index -lt $CorrelationIds.Length; $index++) {
    $key = ":corr$index"
    $attributeValues[$key] = @{ S = $CorrelationIds[$index] }
    $correlationFilters += "correlationId = $key"
  }

  $filterExpression = "PK = :pk AND (" + ($correlationFilters -join " OR ") + ")"
  $attributeValuesJson = $attributeValues | ConvertTo-Json -Depth 5
  $tempFile = Join-Path $env:TEMP ("labellens-analytics-scan-{0}.json" -f ([Guid]::NewGuid().ToString("N")))

  try {
    Set-Content -Path $tempFile -Value $attributeValuesJson -Encoding ascii
    $fileUri = "file://$($tempFile.Replace('\', '/'))"

    return Invoke-AwsCliJson -CliArgs @(
      "dynamodb", "scan",
      "--table-name", $tableName,
      "--filter-expression", $filterExpression,
      "--expression-attribute-values", $fileUri
    )
  } finally {
    if (Test-Path $tempFile) {
      Remove-Item -Force $tempFile
    }
  }
}

function Assert-EventTypeSeen {
  param(
    [object[]] $Items,
    [string] $EventType
  )

  $match = $Items | Where-Object { $_.eventType.S -eq $EventType } | Select-Object -First 1

  if (-not $match) {
    throw "Expected analytics event $EventType was not recorded in DynamoDB."
  }
}

$runId = [System.Guid]::NewGuid().ToString("N").Substring(0, 8)
$foodCorrelationId = "analytics-food-$runId"
$productCorrelationId = "analytics-product-$runId"
$menuCorrelationId = "analytics-menu-$runId"
$favoriteCorrelationId = "analytics-favorite-$runId"
$correlationIds = @($foodCorrelationId, $productCorrelationId, $menuCorrelationId, $favoriteCorrelationId)

Write-Host "Publishing analytics events through gateway..."
Invoke-ApiJson -Method GET -Path "/api/v1/foods/search?q=oats" -Headers @{ "x-correlation-id" = $foodCorrelationId } | Out-Null
Invoke-ApiJson -Method GET -Path "/api/v1/products/barcode/3017624010701" -Headers @{ "x-correlation-id" = $productCorrelationId } | Out-Null

$login = Invoke-ApiJson -Method POST -Path "/api/v1/auth/demo-login" -Body @{ displayName = "Analytics smoke" }
$authHeader = "Bearer $($login.accessToken)"
$menuHeaders = @{ Authorization = $authHeader; "x-correlation-id" = $menuCorrelationId }
$favoriteHeaders = @{ Authorization = $authHeader; "x-correlation-id" = $favoriteCorrelationId }

$savedMenu = Invoke-ApiJson -Method POST -Path "/api/v1/menus" -Headers $menuHeaders -Body (New-MenuPayload -RunId $runId)
$savedFavorite = Invoke-ApiJson -Method POST -Path "/api/v1/favorites" -Headers $favoriteHeaders -Body (New-FavoritePayload)

Write-Host "Waiting for analytics-worker to record events in DynamoDB..."
for ($attempt = 1; $attempt -le 60; $attempt++) {
  $result = Find-AnalyticsEventsByCorrelationIds -CorrelationIds $correlationIds
  $items = @($result.Items)

  if ($items.Count -ge 4) {
    Assert-EventTypeSeen -Items $items -EventType "food.searched.v1"
    Assert-EventTypeSeen -Items $items -EventType "product.scanned.v1"
    Assert-EventTypeSeen -Items $items -EventType "menu.saved.v1"
    Assert-EventTypeSeen -Items $items -EventType "favorite.saved.v1"

    if ($savedMenu.menu.id) {
      Invoke-ApiJson -Method DELETE -Path "/api/v1/menus/$($savedMenu.menu.id)" -Headers @{ Authorization = $authHeader } | Out-Null
    }

    if ($savedFavorite.item.id) {
      Invoke-ApiJson -Method DELETE -Path "/api/v1/favorites/$($savedFavorite.item.id)" -Headers @{ Authorization = $authHeader } | Out-Null
    }

    Write-Host "Analytics events verified. food.searched, product.scanned, menu.saved and favorite.saved were recorded in DynamoDB."
    exit 0
  }

  Start-Sleep -Seconds 1
}

throw "Timed out waiting for analytics-worker to record analytics events. Check service, analytics-worker and SQS logs."
