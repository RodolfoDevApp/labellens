param(
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [string] $DeploymentMode = "release",
  [string] $ImageTag = "latest",
  [string] $RequireApproval = "never",
  [switch] $SkipPreflight
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

$env:AWS_REGION = $Region
$env:AWS_DEFAULT_REGION = $Region

Assert-DeploymentMode -DeploymentMode $DeploymentMode

$profileArgs = Get-ProfileArgs -Profile $Profile
$profileScriptArgs = Get-ProfileScriptArgs -Profile $Profile
$stackName = Get-StackName -Environment $Environment
$resourcePrefix = Get-ResourcePrefix -Environment $Environment
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-EffectiveProfileArgs {
  param([AllowEmptyCollection()][AllowEmptyString()][string[]] $ProfileArgs = @())
  return @($ProfileArgs | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Read-SsmTextParameter {
  param(
    [Parameter(Mandatory = $true)][string] $Name,
    [Parameter(Mandatory = $true)][string] $Region,
    [AllowEmptyCollection()][AllowEmptyString()][string[]] $ProfileArgs = @()
  )

  $effectiveProfileArgs = Get-EffectiveProfileArgs -ProfileArgs $ProfileArgs
  $result = Invoke-NativeCommand -FileName "aws" -Arguments (@("ssm", "get-parameter", "--region", $Region, "--name", $Name, "--query", "Parameter.Value", "--output", "text") + $effectiveProfileArgs)
  $value = $result.Output.Trim()

  if ($result.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($value) -or $value -eq "None") {
    throw "Unable to read SSM parameter $Name.`n$result.Output"
  }

  return $value
}

function Publish-RuntimeConfig {
  param(
    [Parameter(Mandatory = $true)][string] $ResourcePrefix,
    [Parameter(Mandatory = $true)][string] $Region,
    [AllowEmptyCollection()][AllowEmptyString()][string[]] $ProfileArgs = @()
  )

  $effectiveProfileArgs = Get-EffectiveProfileArgs -ProfileArgs $ProfileArgs
  $apiParameterName = "/$ResourcePrefix/apigateway/http-api/url"
  $bucketParameterName = "/$ResourcePrefix/web/site-bucket/name"
  $distributionParameterName = "/$ResourcePrefix/web/cloudfront/distribution-id"

  $apiBaseUrl = Read-SsmTextParameter -Name $apiParameterName -Region $Region -ProfileArgs $effectiveProfileArgs
  $siteBucketName = Read-SsmTextParameter -Name $bucketParameterName -Region $Region -ProfileArgs $effectiveProfileArgs
  $distributionId = Read-SsmTextParameter -Name $distributionParameterName -Region $Region -ProfileArgs $effectiveProfileArgs

  $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) "$ResourcePrefix-runtime-config.json"
  $runtimeConfigJson = @{ apiBaseUrl = $apiBaseUrl } | ConvertTo-Json -Depth 5
  $utf8NoBom = New-Object -TypeName System.Text.UTF8Encoding -ArgumentList $false
  [System.IO.File]::WriteAllText($tempFile, $runtimeConfigJson, $utf8NoBom)

  try {
    Invoke-Checked -FileName "aws" -Arguments (@("s3", "cp", $tempFile, "s3://$siteBucketName/runtime-config.json", "--content-type", "application/json; charset=utf-8", "--cache-control", "no-store, no-cache, must-revalidate", "--region", $Region) + $effectiveProfileArgs) -FailureMessage "Failed to upload runtime-config.json to S3."

    $invalidationResult = Invoke-NativeCommand -FileName "aws" -Arguments (@("cloudfront", "create-invalidation", "--distribution-id", $distributionId, "--paths", "/*", "--query", "Invalidation.Id", "--output", "text") + $effectiveProfileArgs)
    $invalidationId = $invalidationResult.Output.Trim()
    if ($invalidationResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($invalidationId) -or $invalidationId -eq "None") {
      throw "Failed to invalidate CloudFront after web runtime config update.`n$($invalidationResult.Output)"
    }

    Invoke-Checked -FileName "aws" -Arguments (@("cloudfront", "wait", "invalidation-completed", "--distribution-id", $distributionId, "--id", $invalidationId) + $effectiveProfileArgs) -FailureMessage "CloudFront invalidation $invalidationId did not complete."
    Write-Host "Published runtime-config.json and completed CloudFront invalidation $invalidationId."
  }
  finally {
    if (Test-Path $tempFile) {
      Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
  }
}

function Restart-ReleaseEcsServices {
  param(
    [Parameter(Mandatory = $true)][string] $ClusterName,
    [Parameter(Mandatory = $true)][string] $ResourcePrefix,
    [Parameter(Mandatory = $true)][string] $Region,
    [AllowEmptyCollection()][AllowEmptyString()][string[]] $ProfileArgs = @()
  )

  $effectiveProfileArgs = Get-EffectiveProfileArgs -ProfileArgs $ProfileArgs
  $serviceNames = @(
    "$ResourcePrefix-gateway",
    "$ResourcePrefix-auth-service",
    "$ResourcePrefix-food-service",
    "$ResourcePrefix-product-service",
    "$ResourcePrefix-menu-service",
    "$ResourcePrefix-favorites-service"
  )

  Write-Host "Forcing ECS services to start a fresh release deployment so mutable image tags are pulled."

  foreach ($serviceName in $serviceNames) {
    Invoke-Checked -FileName "aws" -Arguments (@("ecs", "update-service", "--cluster", $ClusterName, "--service", $serviceName, "--force-new-deployment", "--region", $Region) + $effectiveProfileArgs) -FailureMessage "Failed to force a new ECS deployment for $serviceName."
  }

  Write-Host "Waiting for ECS services to become stable."
  Invoke-Checked -FileName "aws" -Arguments (@("ecs", "wait", "services-stable", "--cluster", $ClusterName, "--services") + $serviceNames + @("--region", $Region) + $effectiveProfileArgs) -FailureMessage "ECS services did not become stable after forced release deployment."
}

if (-not $SkipPreflight) {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "preflight-deploy.ps1") `
    -Environment $Environment `
    -Region $Region `
    @profileScriptArgs `
    -DeploymentMode $DeploymentMode `
    -ImageTag $ImageTag

  if ($LASTEXITCODE -ne 0) {
    throw "AWS deploy preflight failed for $stackName in $DeploymentMode mode."
  }
}

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
) + (Get-EffectiveProfileArgs -ProfileArgs $profileArgs)

try {
  Invoke-Checked -FileName "npm" -Arguments $args -FailureMessage "CDK deploy failed for $stackName in $DeploymentMode mode."
}
catch {
  Write-Host "CDK deploy failed. Collecting failure context..."

  & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "show-stack-failure.ps1") `
    -Environment $Environment `
    -Region $Region `
    @profileScriptArgs `
    -DeploymentMode $DeploymentMode

  throw
}

if ($DeploymentMode -eq "release") {
  Publish-RuntimeConfig -ResourcePrefix $resourcePrefix -Region $Region -ProfileArgs $profileArgs
  Restart-ReleaseEcsServices -ClusterName "$resourcePrefix-cluster" -ResourcePrefix $resourcePrefix -Region $Region -ProfileArgs $profileArgs
}
