param(
  [string] $BaseUrl = "",
  [string] $Barcode = ""
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

function New-SmokeBarcode {
  $digits = -join ((1..12) | ForEach-Object { Get-Random -Minimum 0 -Maximum 10 })
  return "99$digits"
}

if ([string]::IsNullOrWhiteSpace($Barcode)) {
  $Barcode = New-SmokeBarcode
}

if ($Barcode -notmatch '^\d{8,14}$') {
  throw "Barcode '$Barcode' is invalid. Smoke barcode must contain 8 to 14 digits."
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

function Invoke-ApiExpectNotFound {
  param([string] $Path)

  try {
    Invoke-RestMethod -Method GET -Uri "$BaseUrl$Path" | Out-Null
  } catch {
    $response = $_.Exception.Response

    if (-not $response) {
      throw
    }

    if ([int] $response.StatusCode -ne 404) {
      throw
    }

    return
  }

  throw "Expected $Path to return 404 product.not_found."
}

function Find-ProductNotFoundRecord {
  param([string] $ExpectedBarcode)

  $attributeValues = @{
    ":pk" = @{ S = "OPS#PRODUCT_NOT_FOUND#" }
    ":barcode" = @{ S = $ExpectedBarcode }
  } | ConvertTo-Json -Depth 5

  $tempFile = Join-Path $env:TEMP ("labellens-product-not-found-scan-{0}.json" -f ([Guid]::NewGuid().ToString("N")))

  try {
    Set-Content -Path $tempFile -Value $attributeValues -Encoding ascii
    $fileUri = "file://$($tempFile.Replace('\', '/'))"

    return Invoke-AwsCliJson -CliArgs @(
      "dynamodb", "scan",
      "--table-name", $tableName,
      "--filter-expression", "PK = :pk AND barcode = :barcode",
      "--expression-attribute-values", $fileUri
    )
  } finally {
    if (Test-Path $tempFile) {
      Remove-Item -Force $tempFile
    }
  }
}

Write-Host "Publishing product.not_found.v1 by scanning missing barcode $Barcode through gateway..."
Invoke-ApiExpectNotFound -Path "/api/v1/products/barcode/$Barcode"

Write-Host "Waiting for product-not-found-worker to record the event in DynamoDB..."
for ($attempt = 1; $attempt -le 60; $attempt++) {
  $result = Find-ProductNotFoundRecord -ExpectedBarcode $Barcode

  if ($result.Count -gt 0) {
    Write-Host "Product-not-found event verified. Barcode $Barcode was recorded in DynamoDB by the worker."
    exit 0
  }

  Start-Sleep -Seconds 1
}

throw "Timed out waiting for product-not-found-worker to record barcode $Barcode. Check product-service, worker and SQS logs."