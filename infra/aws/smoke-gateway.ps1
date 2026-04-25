param(
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = ""
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

$profileArgs = Get-ProfileArgs -Profile $Profile
$resourcePrefix = Get-ResourcePrefix -Environment $Environment
$apiParameterName = "/$resourcePrefix/apigateway/http-api/url"
$webParameterName = "/$resourcePrefix/web/url"

function Remove-JsonByteOrderMark {
  param([AllowNull()][string] $Value)

  if ([string]::IsNullOrEmpty($Value)) {
    return $Value
  }

  $clean = $Value.TrimStart([char]0xFEFF)
  if ($clean.StartsWith("ï»¿")) {
    return $clean.Substring(3)
  }

  return $clean
}

function Read-ResponseContentAsUtf8 {
  param([Parameter(Mandatory = $true)] $Response)

  $rawContentStreamProperty = $Response.PSObject.Properties["RawContentStream"]
  if ($rawContentStreamProperty -and $null -ne $rawContentStreamProperty.Value) {
    $stream = $rawContentStreamProperty.Value
    if ($stream.CanSeek) {
      $stream.Position = 0
    }

    $utf8Strict = New-Object -TypeName System.Text.UTF8Encoding -ArgumentList $false, $true
    $reader = New-Object -TypeName System.IO.StreamReader -ArgumentList $stream, $utf8Strict, $true
    try {
      return Remove-JsonByteOrderMark -Value $reader.ReadToEnd()
    }
    finally {
      $reader.Dispose()
    }
  }

  return Remove-JsonByteOrderMark -Value ([string] $Response.Content)
}

$apiBaseUrl = (& aws ssm get-parameter --region $Region @profileArgs --name $apiParameterName --query "Parameter.Value" --output text 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($apiBaseUrl) -or $apiBaseUrl -eq "None") {
  throw "Unable to read API Gateway URL from SSM parameter $apiParameterName."
}

$websiteUrl = (& aws ssm get-parameter --region $Region @profileArgs --name $webParameterName --query "Parameter.Value" --output text 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($websiteUrl) -or $websiteUrl -eq "None") {
  throw "Unable to read website URL from SSM parameter $webParameterName."
}

$apiResponse = Invoke-RestMethod -Method GET -Uri "$apiBaseUrl/api/v1/health"
Write-Host "API Gateway smoke passed."
$apiResponse | ConvertTo-Json -Depth 10

try {
  $authProbe = Invoke-WebRequest -Method POST -Uri "$apiBaseUrl/api/v1/auth/session" -Body "{}" -ContentType "application/json" -UseBasicParsing
  $authStatus = [int] $authProbe.StatusCode
}
catch {
  $authStatus = [int] $_.Exception.Response.StatusCode
}

if ($authStatus -eq 404) {
  throw "Auth session route smoke failed: $apiBaseUrl/api/v1/auth/session returned 404. ECS may still be running an old gateway/auth-service image."
}

if ($authStatus -lt 400 -or $authStatus -ge 500) {
  throw "Auth session route smoke failed with unexpected status $authStatus. Expected a validation error, not a missing or broken route."
}

Write-Host "Auth route smoke passed."

$websiteResponse = Invoke-WebRequest -Method GET -Uri $websiteUrl -UseBasicParsing
if ($websiteResponse.StatusCode -lt 200 -or $websiteResponse.StatusCode -ge 400) {
  throw "Website smoke failed for $websiteUrl."
}

$runtimeConfigUrl = "$websiteUrl/runtime-config.json"
$runtimeConfigResponse = Invoke-WebRequest -Method GET -Uri $runtimeConfigUrl -Headers @{ "Cache-Control" = "no-cache" } -UseBasicParsing
if ($runtimeConfigResponse.StatusCode -lt 200 -or $runtimeConfigResponse.StatusCode -ge 400) {
  throw "Runtime config smoke failed for $runtimeConfigUrl."
}

$runtimeConfigJson = Read-ResponseContentAsUtf8 -Response $runtimeConfigResponse
try {
  $runtimeConfig = $runtimeConfigJson | ConvertFrom-Json
}
catch {
  throw "Runtime config smoke failed because $runtimeConfigUrl did not return valid UTF-8 JSON. $($_.Exception.Message)"
}

if ([string]::IsNullOrWhiteSpace($runtimeConfig.apiBaseUrl)) {
  throw "Runtime config smoke failed because apiBaseUrl is empty in $runtimeConfigUrl."
}

if ($runtimeConfig.apiBaseUrl.TrimEnd("/") -ne $apiBaseUrl.TrimEnd("/")) {
  throw "Runtime config smoke failed because apiBaseUrl '$($runtimeConfig.apiBaseUrl)' does not match '$apiBaseUrl'."
}

Write-Host "Website smoke passed."
Write-Host $websiteUrl
Write-Host "Runtime config smoke passed."
Write-Host $runtimeConfigUrl
