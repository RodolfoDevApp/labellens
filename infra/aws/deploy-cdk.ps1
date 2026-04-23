param(
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [string] $DeploymentMode = "release",
  [string] $ImageTag = "latest",
  [string] $RequireApproval = "never"
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

$env:AWS_REGION = $Region
$env:AWS_DEFAULT_REGION = $Region

Assert-DeploymentMode -DeploymentMode $DeploymentMode

$profileArgs = Get-ProfileArgs -Profile $Profile
$stackName = Get-StackName -Environment $Environment
$resourcePrefix = Get-ResourcePrefix -Environment $Environment

Invoke-Checked -FileName "npm" -Arguments @("run", "build:cdk") -FailureMessage "CDK build failed before deploy."

$args = @(
  "run",
  "cdk",
  "--",
  "deploy",
  $stackName,
  "-c",
  "environmentName=$Environment",
  "-c",
  "deploymentMode=$DeploymentMode",
  "-c",
  "imageTag=$ImageTag",
  "--require-approval",
  $RequireApproval
) + $profileArgs

Invoke-Checked -FileName "npm" -Arguments $args -FailureMessage "CDK deploy failed for $stackName in $DeploymentMode mode."

if ($DeploymentMode -eq "release") {
  $apiParameterName = "/$resourcePrefix/apigateway/http-api/url"
  $bucketParameterName = "/$resourcePrefix/web/site-bucket/name"
  $distributionParameterName = "/$resourcePrefix/web/cloudfront/distribution-id"

  $apiBaseUrl = (& aws ssm get-parameter --region $Region @profileArgs --name $apiParameterName --query "Parameter.Value" --output text 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($apiBaseUrl) -or $apiBaseUrl -eq "None") {
    throw "Unable to read API Gateway URL from SSM parameter $apiParameterName."
  }

  $siteBucketName = (& aws ssm get-parameter --region $Region @profileArgs --name $bucketParameterName --query "Parameter.Value" --output text 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($siteBucketName) -or $siteBucketName -eq "None") {
    throw "Unable to read website bucket name from SSM parameter $bucketParameterName."
  }

  $distributionId = (& aws ssm get-parameter --region $Region @profileArgs --name $distributionParameterName --query "Parameter.Value" --output text 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($distributionId) -or $distributionId -eq "None") {
    throw "Unable to read CloudFront distribution id from SSM parameter $distributionParameterName."
  }

  $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) "$resourcePrefix-runtime-config.json"
  Set-Content -Path $tempFile -Value (@{ apiBaseUrl = $apiBaseUrl } | ConvertTo-Json -Depth 5) -Encoding UTF8

  try {
    Invoke-Checked -FileName "aws" -Arguments (@("s3", "cp", $tempFile, "s3://$siteBucketName/runtime-config.json", "--content-type", "application/json", "--cache-control", "no-store, no-cache, must-revalidate", "--region", $Region) + $profileArgs) -FailureMessage "Failed to upload runtime-config.json to S3."
    Invoke-Checked -FileName "aws" -Arguments (@("cloudfront", "create-invalidation", "--distribution-id", $distributionId, "--paths", "/runtime-config.json") + $profileArgs) -FailureMessage "Failed to invalidate CloudFront runtime-config.json."
  }
  finally {
    if (Test-Path $tempFile) {
      Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
  }
}
