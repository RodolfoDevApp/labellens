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

$websiteResponse = Invoke-WebRequest -Method GET -Uri $websiteUrl -UseBasicParsing
if ($websiteResponse.StatusCode -lt 200 -or $websiteResponse.StatusCode -ge 400) {
  throw "Website smoke failed for $websiteUrl."
}

Write-Host "Website smoke passed."
Write-Host $websiteUrl
