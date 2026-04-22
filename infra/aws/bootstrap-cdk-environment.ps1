param([string] $AccountId = "",[string] $Region = "us-east-1",[string] $Profile = "")
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")
$env:AWS_REGION = $Region; $env:AWS_DEFAULT_REGION = $Region
$resolvedAccountId = Resolve-AwsAccountId -Region $Region -Profile $Profile -ExpectedAccountId $AccountId
$profileArgs = Get-ProfileArgs -Profile $Profile
Invoke-Checked -FileName "npm" -Arguments @("run", "build:cdk") -FailureMessage "CDK build failed before bootstrap."
Invoke-Checked -FileName "npm" -Arguments (@("run", "cdk", "--", "bootstrap", "aws://$resolvedAccountId/$Region") + $profileArgs) -FailureMessage "CDK bootstrap failed."
