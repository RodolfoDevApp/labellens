param(
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [string] $ImageTag = "latest"
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$profileScriptArgs = Get-ProfileScriptArgs -Profile $Profile

Write-Host "Pausing LabelLens-$Environment in $Region. ECS services will be deployed with desiredCount=0."

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "deploy-cdk.ps1") `
  -Environment $Environment `
  -Region $Region `
  @profileScriptArgs `
  -DeploymentMode "bootstrap" `
  -ImageTag $ImageTag `
  -RequireApproval "never"

if ($LASTEXITCODE -ne 0) {
  throw "Pause deploy failed."
}

Write-Host "LabelLens-$Environment paused. ECS/Fargate tasks should scale to 0. ALB, NAT Gateway, DynamoDB, SQS, ECR and CloudWatch resources still exist."
Write-Host "Run npm run aws:status -- -Environment $Environment -Region $Region to verify desired/running counts."
