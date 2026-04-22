param(
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [string] $ImageTag = "bootstrap"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$profileScriptArgs = @()

if (-not [string]::IsNullOrWhiteSpace($Profile)) {
  $profileScriptArgs = @("-Profile", $Profile)
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "deploy-cdk.ps1") `
  -Environment $Environment `
  -Region $Region `
  @profileScriptArgs `
  -DeploymentMode "bootstrap" `
  -ImageTag $ImageTag `
  -RequireApproval "never"

if ($LASTEXITCODE -ne 0) {
  throw "LabelLens infrastructure bootstrap deploy failed."
}