param(
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [string] $DeploymentMode = "release",
  [int] $MaxEvents = 25
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

$ErrorActionPreference = "Stop"
$env:AWS_REGION = $Region
$env:AWS_DEFAULT_REGION = $Region

Assert-Command "aws"
Assert-DeploymentMode -DeploymentMode $DeploymentMode

$profileArgs = Get-ProfileArgs -Profile $Profile
$stackName = Get-StackName -Environment $Environment
$resourcePrefix = Get-ResourcePrefix -Environment $Environment
$clusterName = "$resourcePrefix-cluster"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$servicesManifestPath = Join-Path (Split-Path -Parent $scriptDir) "docker/services.json"

function Invoke-AwsJson {
  param([Parameter(Mandatory = $true)][string[]] $Arguments)

  $result = Invoke-NativeCommand -FileName "aws" -Arguments ($Arguments + @("--region", $Region) + $profileArgs + @("--output", "json"))
  if ($result.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($result.Output)) {
    return $null
  }

  try {
    return $result.Output | ConvertFrom-Json -Depth 20
  }
  catch {
    return $null
  }
}

function Read-ServicesManifest {
  if (-not (Test-Path $servicesManifestPath)) {
    return @()
  }

  $raw = Get-Content -Path $servicesManifestPath -Raw -Encoding UTF8
  $services = $raw | ConvertFrom-Json
  if (-not $services) {
    return @()
  }

  return @($services)
}

function Show-StackStatusSummary {
  $stackData = Invoke-AwsJson -Arguments @("cloudformation", "describe-stacks", "--stack-name", $stackName)
  if (-not $stackData -or -not $stackData.Stacks -or $stackData.Stacks.Count -eq 0) {
    Write-Host "CloudFormation stack $stackName is not present."
    return
  }

  $stack = $stackData.Stacks[0]
  Write-Host "CloudFormation stack status: $($stack.StackStatus)"
  if ($stack.LastUpdatedTime) {
    Write-Host "Last updated:                $($stack.LastUpdatedTime)"
  }
  Write-Host ""
}

function Show-CloudFormationFailures {
  $eventsData = Invoke-AwsJson -Arguments @("cloudformation", "describe-stack-events", "--stack-name", $stackName)
  if (-not $eventsData -or -not $eventsData.StackEvents) {
    Write-Host "No CloudFormation stack events available."
    return
  }

  $interestingEvents = @($eventsData.StackEvents | Where-Object {
    $_.ResourceStatus -like "*_FAILED" -or
    $_.ResourceStatus -eq "ROLLBACK_IN_PROGRESS" -or
    $_.ResourceStatus -eq "UPDATE_ROLLBACK_IN_PROGRESS" -or
    $_.ResourceStatus -eq "UPDATE_ROLLBACK_FAILED"
  } | Select-Object -First $MaxEvents)

  if ($interestingEvents.Count -eq 0) {
    Write-Host "No FAILED or rollback CloudFormation events were found in the latest history."
    return
  }

  Write-Host "--- Recent CloudFormation failure events ---"
  foreach ($event in $interestingEvents) {
    Write-Host ("[{0}] {1} | {2} | {3}" -f $event.Timestamp, $event.ResourceStatus, $event.LogicalResourceId, $event.ResourceType)
    if (-not [string]::IsNullOrWhiteSpace($event.ResourceStatusReason)) {
      Write-Host ("  Reason: {0}" -f $event.ResourceStatusReason)
    }
  }
  Write-Host ""
}

function Show-EcsRolloutStatus {
  $services = Read-ServicesManifest
  if ($services.Count -eq 0) {
    Write-Host "Service manifest not available; skipping ECS rollout diagnostics."
    return
  }

  $serviceNames = @($services | ForEach-Object { "$resourcePrefix-$($_.name)" })
  $ecsData = Invoke-AwsJson -Arguments (@("ecs", "describe-services", "--cluster", $clusterName, "--services") + $serviceNames)
  if (-not $ecsData) {
    Write-Host "ECS diagnostics not available for cluster $clusterName."
    return
  }

  if ($ecsData.failures -and $ecsData.failures.Count -gt 0) {
    Write-Host "--- ECS describe-services failures ---"
    foreach ($failure in $ecsData.failures) {
      Write-Host ("{0}: {1}" -f $failure.arn, $failure.reason)
    }
    Write-Host ""
  }

  if (-not $ecsData.services -or $ecsData.services.Count -eq 0) {
    Write-Host "No ECS services found for diagnostics."
    return
  }

  Write-Host "--- ECS rollout status ---"
  foreach ($service in $ecsData.services) {
    $primaryDeployment = @($service.deployments | Where-Object { $_.status -eq "PRIMARY" } | Select-Object -First 1)
    if (-not $primaryDeployment) {
      $primaryDeployment = @($service.deployments | Select-Object -First 1)
    }

    $rolloutState = ""
    $rolloutReason = ""

    if ($primaryDeployment) {
      $rolloutState = $primaryDeployment.rolloutState
      $rolloutReason = $primaryDeployment.rolloutStateReason
    }

    Write-Host ("{0} :: desired={1} running={2} pending={3} rollout={4}" -f $service.serviceName, $service.desiredCount, $service.runningCount, $service.pendingCount, $rolloutState)
    if (-not [string]::IsNullOrWhiteSpace($rolloutReason)) {
      Write-Host ("  Reason: {0}" -f $rolloutReason)
    }
  }
  Write-Host ""
}

Write-Host "=== LabelLens deploy failure context ==="
Write-Host "Environment:     $Environment"
Write-Host "Region:          $Region"
Write-Host "Deployment mode: $DeploymentMode"
Write-Host "Stack:           $stackName"
Write-Host ""

Show-StackStatusSummary
Show-CloudFormationFailures

if ($DeploymentMode -eq "release") {
  Show-EcsRolloutStatus
}
