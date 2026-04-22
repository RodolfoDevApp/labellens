param(
  [string] $AccountId = "",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [switch] $RequireBootstrap
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

Assert-Command "aws"
Assert-Command "docker"
Assert-Command "node"
Assert-Command "npm"

Invoke-Checked -FileName "docker" -Arguments @("version") -FailureMessage "Docker is not available or Docker Desktop is not running."

$resolvedAccountId = Resolve-AwsAccountId -Region $Region -Profile $Profile -ExpectedAccountId $AccountId
$profileArgs = Get-ProfileArgs -Profile $Profile

$bootstrapArgs = @(
  "cloudformation",
  "describe-stacks",
  "--region",
  $Region
) + $profileArgs + @(
  "--stack-name",
  "CDKToolkit",
  "--query",
  "Stacks[0].StackStatus",
  "--output",
  "text"
)

$bootstrap = Invoke-NativeCommand -FileName "aws" -Arguments $bootstrapArgs

if ($bootstrap.ExitCode -ne 0) {
  if ($RequireBootstrap) {
    throw "CDKToolkit was not found. Run npm run aws:cdk:bootstrap first."
  }

  Write-Host "CDKToolkit was not found yet. First deploy will run CDK bootstrap."
} else {
  Write-Host "CDK bootstrap stack status: $($bootstrap.Output)"
}

Write-Host "AWS deploy prerequisites verified for account $resolvedAccountId region $Region."