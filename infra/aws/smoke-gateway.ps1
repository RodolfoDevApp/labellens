param(
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = ""
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

$profileArgs = Get-ProfileArgs -Profile $Profile
$resourcePrefix = Get-ResourcePrefix -Environment $Environment
$parameterName = "/$resourcePrefix/apigateway/http-api/url"
$apiBaseUrl = (& aws ssm get-parameter --region $Region @profileArgs --name $parameterName --query "Parameter.Value" --output text 2>&1 | Out-String).Trim()

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($apiBaseUrl) -or $apiBaseUrl -eq "None") {
  throw "Unable to read API Gateway URL from SSM parameter $parameterName."
}

$response = Invoke-RestMethod -Method GET -Uri "$apiBaseUrl/api/v1/health"
Write-Host "API Gateway smoke passed."
$response | ConvertTo-Json -Depth 10
