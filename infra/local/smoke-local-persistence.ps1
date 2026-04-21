param(
  [string] $BaseUrl = "",
  [string] $ComposeFile = "infra/compose/docker-compose.yml",
  [switch] $KeepData
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $gatewayPort = $env:LABEL_LENS_GATEWAY_PORT
  if (-not $gatewayPort) {
    $gatewayPort = $env:LABEL_LENS_API_PORT
  }
  if (-not $gatewayPort) {
    $gatewayPort = "4000"
  }

  $BaseUrl = "http://localhost:$gatewayPort"
}

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

function Wait-ApiReady {
  param([int] $MaxAttempts = 60)

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      $health = Invoke-ApiJson -Method GET -Path "/api/v1/health"

      if ($health.status -eq "ok") {
        return $health
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw "Gateway/API did not become ready at $BaseUrl. Run npm run compose:up and check npm run compose:logs:gateway and npm run compose:logs:api."
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
    name = "Smoke persistence $RunId"
    date = "2026-04-19"
    meals = @(
      @{
        type = "breakfast"
        items = @(
          @{
            id = "smoke-item-$RunId"
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

function Assert-ContainsId {
  param(
    [object[]] $Items,
    [string] $Id,
    [string] $Name
  )

  $match = $Items | Where-Object { $_.id -eq $Id } | Select-Object -First 1

  if (-not $match) {
    throw "$Name id $Id was not found after API restart. DynamoDB persistence is not verified."
  }
}

Write-Host "Waiting for LabelLens gateway at $BaseUrl..."
$health = Wait-ApiReady

if ($health.storageDriver -ne "dynamodb") {
  throw "Expected API storageDriver=dynamodb through gateway, got '$($health.storageDriver)'. Run npm run compose:up instead of npm run dev:api."
}

$runId = [System.Guid]::NewGuid().ToString("N").Substring(0, 8)
$login = Invoke-ApiJson -Method POST -Path "/api/v1/auth/demo-login" -Body @{ displayName = "Smoke persistence" }
$headers = @{ Authorization = "Bearer $($login.accessToken)" }

Write-Host "Saving menu and favorite through the gateway HTTP API..."
$savedMenu = Invoke-ApiJson -Method POST -Path "/api/v1/menus" -Headers $headers -Body (New-MenuPayload -RunId $runId)
$savedFavorite = Invoke-ApiJson -Method POST -Path "/api/v1/favorites" -Headers $headers -Body (New-FavoritePayload)

$menuId = $savedMenu.menu.id
$favoriteId = $savedFavorite.item.id

if (-not $menuId) {
  throw "Menu save response did not include menu.id."
}

if (-not $favoriteId) {
  throw "Favorite save response did not include item.id."
}

Write-Host "Restarting API container to prove data is not in process memory and gateway keeps the public boundary..."
docker compose -f $ComposeFile restart api | Out-Host
$healthAfterRestart = Wait-ApiReady

if ($healthAfterRestart.storageDriver -ne "dynamodb") {
  throw "API restarted without DynamoDB storage driver. Got '$($healthAfterRestart.storageDriver)'."
}

$loginAfterRestart = Invoke-ApiJson -Method POST -Path "/api/v1/auth/demo-login" -Body @{ displayName = "Smoke persistence" }
$headersAfterRestart = @{ Authorization = "Bearer $($loginAfterRestart.accessToken)" }

Write-Host "Reading menus and favorites through gateway after API restart..."
$menusAfterRestart = Invoke-ApiJson -Method GET -Path "/api/v1/menus" -Headers $headersAfterRestart
$favoritesAfterRestart = Invoke-ApiJson -Method GET -Path "/api/v1/favorites" -Headers $headersAfterRestart

Assert-ContainsId -Items @($menusAfterRestart.items) -Id $menuId -Name "Menu"
Assert-ContainsId -Items @($favoritesAfterRestart.items) -Id $favoriteId -Name "Favorite"

if (-not $KeepData) {
  Write-Host "Cleaning up smoke data..."
  Invoke-ApiJson -Method DELETE -Path "/api/v1/menus/$menuId" -Headers $headersAfterRestart | Out-Null
  Invoke-ApiJson -Method DELETE -Path "/api/v1/favorites/$favoriteId" -Headers $headersAfterRestart | Out-Null
}

Write-Host "Local gateway + DynamoDB persistence verified. Menu and favorite survived API restart."
