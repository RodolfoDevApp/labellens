param(
  [string] $AccountId = "",
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [string] $ImageTag = "latest",
  [string] $LocalTag = "local"
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$profileScriptArgs = @()

if (-not [string]::IsNullOrWhiteSpace($Profile)) {
  $profileScriptArgs = @("-Profile", $Profile)
}

$resolvedAccountId = Resolve-AwsAccountId -Region $Region -Profile $Profile -ExpectedAccountId $AccountId

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "check-aws-prerequisites.ps1") `
  -AccountId $resolvedAccountId `
  -Region $Region `
  @profileScriptArgs

if ($LASTEXITCODE -ne 0) {
  throw "AWS prerequisite check failed."
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "bootstrap-cdk-environment.ps1") `
  -AccountId $resolvedAccountId `
  -Region $Region `
  @profileScriptArgs

if ($LASTEXITCODE -ne 0) {
  throw "CDK environment bootstrap failed."
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "preflight-deploy.ps1") `
  -AccountId $resolvedAccountId `
  -Environment $Environment `
  -Region $Region `
  @profileScriptArgs `
  -DeploymentMode "bootstrap" `
  -ImageTag $ImageTag

if ($LASTEXITCODE -ne 0) {
  throw "AWS bootstrap preflight failed."
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "deploy-infra-bootstrap.ps1") `
  -Environment $Environment `
  -Region $Region `
  @profileScriptArgs

if ($LASTEXITCODE -ne 0) {
  throw "Infrastructure bootstrap deploy failed."
}

Invoke-Checked `
  -FileName "npm" `
  -Arguments @("run", "containers:build", "--", "-Tag", $LocalTag) `
  -FailureMessage "Container image build failed."

Invoke-Checked `
  -FileName "npm" `
  -Arguments @(
    "run",
    "containers:tag",
    "--",
    "-AccountId",
    $resolvedAccountId,
    "-Region",
    $Region,
    "-Environment",
    $Environment,
    "-LocalTag",
    $LocalTag,
    "-RemoteTag",
    $ImageTag
  ) `
  -FailureMessage "Container image tagging failed."

Invoke-Checked `
  -FileName "npm" `
  -Arguments @(
    "run",
    "containers:push",
    "--",
    "-AccountId",
    $resolvedAccountId,
    "-Region",
    $Region,
    "-Environment",
    $Environment,
    "-RemoteTag",
    $ImageTag
  ) `
  -FailureMessage "Container image push failed."

& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "deploy-cdk.ps1") `
  -Environment $Environment `
  -Region $Region `
  @profileScriptArgs `
  -DeploymentMode "release" `
  -ImageTag $ImageTag `
  -RequireApproval "never"

if ($LASTEXITCODE -ne 0) {
  throw "Release deploy failed."
}

Write-Host "First AWS deploy completed for LabelLens-$Environment with image tag $ImageTag."