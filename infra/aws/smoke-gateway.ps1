param([string] $Environment = "dev",[string] $Region = "us-east-1",[string] $Profile = "")
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")
$profileArgs = Get-ProfileArgs -Profile $Profile; $resourcePrefix = Get-ResourcePrefix -Environment $Environment; $parameterName = "/$resourcePrefix/ingress/gateway-url"
$gatewayUrl = (& aws ssm get-parameter --region $Region @profileArgs --name $parameterName --query "Parameter.Value" --output text 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gatewayUrl) -or $gatewayUrl -eq "None") { throw "Unable to read gateway URL from SSM parameter $parameterName." }
$response = Invoke-RestMethod -Method GET -Uri "$gatewayUrl/gateway/health"
Write-Host "Gateway smoke passed."
$response | ConvertTo-Json -Depth 10
