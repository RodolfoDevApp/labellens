param(
  [string] $AccountId = "",
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [string] $DeploymentMode = "release",
  [string] $ImageTag = "latest",
  [switch] $RunDiff
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

$ErrorActionPreference = "Stop"
$env:AWS_REGION = $Region
$env:AWS_DEFAULT_REGION = $Region

Assert-Command "aws"
Assert-Command "npm"
Assert-DeploymentMode -DeploymentMode $DeploymentMode

$profileArgs = Get-ProfileArgs -Profile $Profile
$profileScriptArgs = Get-ProfileScriptArgs -Profile $Profile
$resolvedAccountId = Resolve-AwsAccountId -Region $Region -Profile $Profile -ExpectedAccountId $AccountId
$stackName = Get-StackName -Environment $Environment
$resourcePrefix = Get-ResourcePrefix -Environment $Environment
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$servicesManifestPath = Join-Path (Split-Path -Parent $scriptDir) "docker/services.json"

function Read-ServicesManifest {
  if (-not (Test-Path $servicesManifestPath)) {
    throw "Missing Docker services manifest at $servicesManifestPath."
  }

  $raw = Get-Content -Path $servicesManifestPath -Raw -Encoding UTF8
  $services = $raw | ConvertFrom-Json
  if (-not $services) {
    throw "Docker services manifest at $servicesManifestPath is empty."
  }

  return @($services)
}

function Get-AwsTextOutput {
  param([Parameter(Mandatory = $true)][string[]] $Arguments)

  $result = Invoke-NativeCommand -FileName "aws" -Arguments ($Arguments + @("--region", $Region) + $profileArgs)
  if ($result.ExitCode -ne 0) {
    return ""
  }

  return $result.Output.Trim()
}

function Get-AwsJsonOutput {
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

function Get-StackStatus {
  $status = Get-AwsTextOutput -Arguments @(
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    $stackName,
    "--query",
    "Stacks[0].StackStatus",
    "--output",
    "text"
  )

  if ([string]::IsNullOrWhiteSpace($status) -or $status -eq "None") {
    return ""
  }

  return $status
}

function Assert-StackStateIsDeployable {
  param([Parameter(Mandatory = $true)][string] $Status)

  $stableStatuses = @(
    "CREATE_COMPLETE",
    "UPDATE_COMPLETE",
    "UPDATE_ROLLBACK_COMPLETE",
    "IMPORT_COMPLETE",
    "IMPORT_ROLLBACK_COMPLETE"
  )

  if ($stableStatuses -contains $Status) {
    Write-Host "CloudFormation stack $stackName exists and is deployable: $Status"
    return
  }

  $cleanupCommand = "npm run aws:destroy -- -Environment $Environment -Region $Region -Force"
  if (-not [string]::IsNullOrWhiteSpace($Profile)) {
    $cleanupCommand += " -Profile $Profile"
  }

  throw "CloudFormation stack $stackName exists but is not in a deployable state: $Status`nResolve or delete the stack before deploying again.`nSuggested cleanup command: $cleanupCommand"
}

function Add-Collision {
  param(
    [AllowEmptyCollection()][System.Collections.Generic.List[string]] $Collisions,
    [Parameter(Mandatory = $true)][string] $Type,
    [Parameter(Mandatory = $true)][string] $Name
  )

  $Collisions.Add("$Type :: $Name") | Out-Null
}

function Test-DynamoDbCollision {
  param(
    [Parameter(Mandatory = $true)][string] $TableName,
    [AllowEmptyCollection()][System.Collections.Generic.List[string]] $Collisions
  )

  $output = Get-AwsTextOutput -Arguments @(
    "dynamodb",
    "describe-table",
    "--table-name",
    $TableName,
    "--query",
    "Table.TableName",
    "--output",
    "text"
  )

  if (-not [string]::IsNullOrWhiteSpace($output) -and $output -ne "None") {
    Add-Collision -Collisions $Collisions -Type "DynamoDB table" -Name $TableName
  }
}

function Test-EcrCollisions {
  param(
    [Parameter(Mandatory = $true)][string[]] $RepositoryNames,
    [AllowEmptyCollection()][System.Collections.Generic.List[string]] $Collisions
  )

  foreach ($repositoryName in $RepositoryNames) {
    $output = Get-AwsTextOutput -Arguments @(
      "ecr",
      "describe-repositories",
      "--repository-names",
      $repositoryName,
      "--query",
      "repositories[0].repositoryName",
      "--output",
      "text"
    )

    if (-not [string]::IsNullOrWhiteSpace($output) -and $output -ne "None") {
      Add-Collision -Collisions $Collisions -Type "ECR repository" -Name $repositoryName
    }
  }
}

function Test-SsmCollisions {
  param([AllowEmptyCollection()][System.Collections.Generic.List[string]] $Collisions)

  $output = Get-AwsTextOutput -Arguments @(
    "ssm",
    "describe-parameters",
    "--parameter-filters",
    "Key=Name,Option=BeginsWith,Values=/$resourcePrefix/",
    "--query",
    "Parameters[].Name",
    "--output",
    "text"
  )

  if ([string]::IsNullOrWhiteSpace($output) -or $output -eq "None") {
    return
  }

  $names = $output.Split([char[]]"`t`r`n ", [System.StringSplitOptions]::RemoveEmptyEntries)
  foreach ($name in $names) {
    Add-Collision -Collisions $Collisions -Type "SSM parameter" -Name $name
  }
}

function Test-SqsCollisions {
  param(
    [Parameter(Mandatory = $true)][string[]] $QueueNames,
    [AllowEmptyCollection()][System.Collections.Generic.List[string]] $Collisions
  )

  foreach ($queueName in $QueueNames) {
    $output = Get-AwsTextOutput -Arguments @(
      "sqs",
      "get-queue-url",
      "--queue-name",
      $queueName,
      "--query",
      "QueueUrl",
      "--output",
      "text"
    )

    if (-not [string]::IsNullOrWhiteSpace($output) -and $output -ne "None") {
      Add-Collision -Collisions $Collisions -Type "SQS queue" -Name $queueName
    }
  }
}

function Test-LogGroupCollisions {
  param([AllowEmptyCollection()][System.Collections.Generic.List[string]] $Collisions)

  $prefixes = @(
    "/$resourcePrefix/ecs/",
    "/$resourcePrefix/lambda/",
    "/$resourcePrefix/apigateway/"
  )

  foreach ($prefix in $prefixes) {
    $output = Get-AwsTextOutput -Arguments @(
      "logs",
      "describe-log-groups",
      "--log-group-name-prefix",
      $prefix,
      "--query",
      "logGroups[].logGroupName",
      "--output",
      "text"
    )

    if ([string]::IsNullOrWhiteSpace($output) -or $output -eq "None") {
      continue
    }

    $logGroupNames = $output.Split([char[]]"`t`r`n ", [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($logGroupName in $logGroupNames) {
      Add-Collision -Collisions $Collisions -Type "CloudWatch log group" -Name $logGroupName
    }
  }
}

function Test-AlarmCollisions {
  param([AllowEmptyCollection()][System.Collections.Generic.List[string]] $Collisions)

  $output = Get-AwsTextOutput -Arguments @(
    "cloudwatch",
    "describe-alarms",
    "--alarm-name-prefix",
    $resourcePrefix,
    "--query",
    "MetricAlarms[].AlarmName",
    "--output",
    "text"
  )

  if ([string]::IsNullOrWhiteSpace($output) -or $output -eq "None") {
    return
  }

  $alarmNames = $output.Split([char[]]"`t`r`n ", [System.StringSplitOptions]::RemoveEmptyEntries)
  foreach ($alarmName in $alarmNames) {
    Add-Collision -Collisions $Collisions -Type "CloudWatch alarm" -Name $alarmName
  }
}

function Test-SchedulerCollisions {
  param(
    [Parameter(Mandatory = $true)][string] $ScheduleGroupName,
    [AllowEmptyCollection()][System.Collections.Generic.List[string]] $Collisions
  )

  $groupState = Get-AwsTextOutput -Arguments @(
    "scheduler",
    "get-schedule-group",
    "--name",
    $ScheduleGroupName,
    "--query",
    "State",
    "--output",
    "text"
  )

  if (-not [string]::IsNullOrWhiteSpace($groupState) -and $groupState -ne "None") {
    Add-Collision -Collisions $Collisions -Type "EventBridge schedule group" -Name $ScheduleGroupName
  }

  $output = Get-AwsTextOutput -Arguments @(
    "scheduler",
    "list-schedules",
    "--group-name",
    $ScheduleGroupName,
    "--query",
    "Schedules[].Name",
    "--output",
    "text"
  )

  if ([string]::IsNullOrWhiteSpace($output) -or $output -eq "None") {
    return
  }

  $scheduleNames = $output.Split([char[]]"`t`r`n ", [System.StringSplitOptions]::RemoveEmptyEntries)
  foreach ($scheduleName in $scheduleNames) {
    Add-Collision -Collisions $Collisions -Type "EventBridge schedule" -Name $scheduleName
  }
}

function Test-CognitoCollision {
  param(
    [Parameter(Mandatory = $true)][string] $UserPoolName,
    [AllowEmptyCollection()][System.Collections.Generic.List[string]] $Collisions
  )

  $data = Get-AwsJsonOutput -Arguments @(
    "cognito-idp",
    "list-user-pools",
    "--max-results",
    "60"
  )

  if (-not $data -or -not $data.UserPools) {
    return
  }

  foreach ($userPool in $data.UserPools) {
    if ($userPool.Name -eq $UserPoolName) {
      Add-Collision -Collisions $Collisions -Type "Cognito user pool" -Name "$($userPool.Name) ($($userPool.Id))"
    }
  }
}

function Assert-NoBootstrapCollisions {
  param([Parameter(Mandatory = $true)][string[]] $RepositoryNames)

  $collisions = New-Object 'System.Collections.Generic.List[string]'
  $tableName = "$resourcePrefix-table"
  $scheduleGroupName = "$resourcePrefix-schedules"
  $userPoolName = "$resourcePrefix-users"
  $queueNames = @(
    "$resourcePrefix-product-not-found-queue",
    "$resourcePrefix-product-not-found-dlq",
    "$resourcePrefix-analytics-queue",
    "$resourcePrefix-analytics-dlq",
    "$resourcePrefix-food-cache-refresh-queue",
    "$resourcePrefix-food-cache-refresh-dlq",
    "$resourcePrefix-product-cache-refresh-queue",
    "$resourcePrefix-product-cache-refresh-dlq"
  )

  Test-DynamoDbCollision -TableName $tableName -Collisions $collisions
  Test-EcrCollisions -RepositoryNames $RepositoryNames -Collisions $collisions
  Test-SsmCollisions -Collisions $collisions
  Test-SqsCollisions -QueueNames $queueNames -Collisions $collisions
  Test-LogGroupCollisions -Collisions $collisions
  Test-AlarmCollisions -Collisions $collisions
  Test-SchedulerCollisions -ScheduleGroupName $scheduleGroupName -Collisions $collisions
  Test-CognitoCollision -UserPoolName $userPoolName -Collisions $collisions

  if ($collisions.Count -eq 0) {
    Write-Host "No retained-name collisions detected for prefix $resourcePrefix."
    return
  }

  $cleanupCommand = "npm run aws:destroy -- -Environment $Environment -Region $Region -Force -SkipCdkDestroy"
  if (-not [string]::IsNullOrWhiteSpace($Profile)) {
    $cleanupCommand += " -Profile $Profile"
  }

  $details = $collisions | Sort-Object | ForEach-Object { " - $_" }
  throw "Preflight found AWS resources that would collide with a fresh deploy of $stackName because the stack is absent but retained named resources still exist.`n$($details -join "`n")`nCleanup suggestion: $cleanupCommand"
}

function Assert-UsdaApiKeyParameterIsReadable {
  $parameterName = $env:LABEL_LENS_USDA_API_KEY_PARAMETER_NAME
  if ([string]::IsNullOrWhiteSpace($parameterName)) {
    $parameterName = "/labellens/$Environment/usda/api-key"
  }

  # Do not read or decrypt the secret value during preflight. DescribeParameters is enough to
  # verify that the secure parameter exists and avoids fragile JSON parsing around encrypted values.
  $parameterType = Get-AwsTextOutput -Arguments @(
    "ssm",
    "describe-parameters",
    "--parameter-filters",
    "Key=Name,Option=Equals,Values=$parameterName",
    "--query",
    "Parameters[0].Type",
    "--output",
    "text"
  )

  if ([string]::IsNullOrWhiteSpace($parameterType) -or $parameterType -eq "None") {
    throw "Release deploy preflight failed because the USDA API key parameter was not found: $parameterName"
  }

  if ($parameterType -ne "SecureString") {
    throw "Release deploy preflight failed because the USDA API key parameter must be SecureString: $parameterName. Actual type: $parameterType"
  }

  Write-Host "USDA API key parameter is present as SecureString: $parameterName."
}

function Assert-ReleaseImagesExist {
  param([Parameter(Mandatory = $true)][string[]] $RepositoryNames)

  $missingImages = New-Object 'System.Collections.Generic.List[string]'

  foreach ($repositoryName in $RepositoryNames) {
    $output = Get-AwsTextOutput -Arguments @(
      "ecr",
      "describe-images",
      "--repository-name",
      $repositoryName,
      "--image-ids",
      "imageTag=$ImageTag",
      "--query",
      "imageDetails[0].imageDigest",
      "--output",
      "text"
    )

    if ([string]::IsNullOrWhiteSpace($output) -or $output -eq "None") {
      $missingImages.Add("${repositoryName}:${ImageTag}") | Out-Null
    }
  }

  if ($missingImages.Count -eq 0) {
    Write-Host "Release image tag '$ImageTag' exists in all required ECR repositories."
    return
  }

  $details = $missingImages | Sort-Object | ForEach-Object { " - $_" }
  throw "Release deploy preflight failed because the requested image tag was not found in all required ECR repositories.`n$($details -join "`n")"
}

$services = Read-ServicesManifest
$repositoryNames = @($services | ForEach-Object { "$resourcePrefix/$($_.name)" })
$stackStatus = Get-StackStatus

Write-Host "Running AWS deploy preflight."
Write-Host "Account:         $resolvedAccountId"
Write-Host "Region:          $Region"
Write-Host "Environment:     $Environment"
Write-Host "Deployment mode: $DeploymentMode"
Write-Host "Stack:           $stackName"
Write-Host "Image tag:       $ImageTag"
Write-Host ""

if ([string]::IsNullOrWhiteSpace($stackStatus)) {
  Write-Host "CloudFormation stack $stackName does not exist yet. Checking for retained-name collisions..."
  Assert-NoBootstrapCollisions -RepositoryNames $repositoryNames
} else {
  Assert-StackStateIsDeployable -Status $stackStatus
}

if ($DeploymentMode -eq "release") {
  Assert-UsdaApiKeyParameterIsReadable
  Assert-ReleaseImagesExist -RepositoryNames $repositoryNames
}

if ($RunDiff) {
  Write-Host "Running CDK diff as part of preflight..."
  & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "diff-cdk.ps1") `
    -Environment $Environment `
    -Region $Region `
    @profileScriptArgs `
    -DeploymentMode $DeploymentMode `
    -ImageTag $ImageTag

  if ($LASTEXITCODE -ne 0) {
    throw "CDK diff failed during preflight."
  }
}

Write-Host "AWS deploy preflight passed for $stackName ($DeploymentMode)."
