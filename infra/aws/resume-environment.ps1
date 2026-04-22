param(
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [string] $ImageTag = "latest",
  [switch] $Smoke
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$profileScriptArgs = Get-ProfileScriptArgs -Profile $Profile

Write-Host "Resuming LabelLens-$Environment in $Region with image tag $ImageTag."

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "deploy-cdk.ps1") `
  -Environment $Environment `
  -Region $Region `
  @profileScriptArgs `
  -DeploymentMode "release" `
  -ImageTag $ImageTag `
  -RequireApproval "never"

if ($LASTEXITCODE -ne 0) {
  throw "Resume deploy failed."
}

if ($Smoke) {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "smoke-gateway.ps1") `
    -Environment $Environment `
    -Region $Region `
    @profileScriptArgs

  if ($LASTEXITCODE -ne 0) {
    throw "Gateway smoke failed after resume."
  }
}

Write-Host "LabelLens-$Environment resumed."
