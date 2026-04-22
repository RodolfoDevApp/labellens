param([string] $Environment = "dev",[string] $Region = "us-east-1",[string] $Profile = "",[string] $DeploymentMode = "release",[string] $ImageTag = "latest",[string] $RequireApproval = "never")
. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")
$env:AWS_REGION = $Region; $env:AWS_DEFAULT_REGION = $Region
Assert-DeploymentMode -DeploymentMode $DeploymentMode
$profileArgs = Get-ProfileArgs -Profile $Profile; $stackName = Get-StackName -Environment $Environment
Invoke-Checked -FileName "npm" -Arguments @("run", "build:cdk") -FailureMessage "CDK build failed before deploy."
$args = @("run", "cdk", "--", "deploy", $stackName, "-c", "environmentName=$Environment", "-c", "deploymentMode=$DeploymentMode", "-c", "imageTag=$ImageTag", "--require-approval", $RequireApproval) + $profileArgs
Invoke-Checked -FileName "npm" -Arguments $args -FailureMessage "CDK deploy failed for $stackName in $DeploymentMode mode."
