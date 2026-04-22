param(
  [string] $AccountId = "",
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = "",
  [string] $ImageTag = "latest",
  [switch] $Force,
  [switch] $SkipCdkDestroy,
  [switch] $DeleteCdkToolkit
)

$ErrorActionPreference = "Stop"

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

if (-not $Force) {
  throw "Refusing to destroy AWS resources without -Force. Re-run with: npm run aws:destroy -- -Environment $Environment -Region $Region -Force"
}

Assert-Command "aws"
Assert-Command "npm"

$env:AWS_REGION = $Region
$env:AWS_DEFAULT_REGION = $Region

$resolvedAccountId = Resolve-AwsAccountId -Region $Region -Profile $Profile -ExpectedAccountId $AccountId
$profileArgs = Get-ProfileArgs -Profile $Profile
$stackName = Get-StackName -Environment $Environment
$resourcePrefix = Get-ResourcePrefix -Environment $Environment
$clusterName = "$resourcePrefix-cluster"
$tableName = "$resourcePrefix-table"
$scheduleGroupName = "$resourcePrefix-schedules"

$deployableNames = @(
  "gateway",
  "auth-service",
  "food-service",
  "product-service",
  "menu-service",
  "favorites-service",
  "product-not-found-worker",
  "analytics-worker",
  "food-cache-refresh-worker",
  "product-cache-refresh-worker",
  "dlq-handler"
)

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

$scheduleNames = @(
  "$resourcePrefix-food-cache-refresh-daily",
  "$resourcePrefix-product-cache-refresh-daily"
)

$repositoryNames = $deployableNames | ForEach-Object { "$resourcePrefix/$_" }

function Invoke-AwsOptional {
  param(
    [Parameter(Mandatory = $true)][string[]] $Arguments,
    [Parameter(Mandatory = $true)][string] $Description
  )

  $result = Invoke-NativeCommand -FileName "aws" -Arguments ($Arguments + @("--region", $Region) + $profileArgs)
  if ($result.ExitCode -ne 0) {
    Write-Host "WARN: $Description failed or resource was already absent."
    if (-not [string]::IsNullOrWhiteSpace($result.Output)) {
      Write-Host $result.Output
    }
  }
  return $result
}

function Invoke-AwsRequired {
  param(
    [Parameter(Mandatory = $true)][string[]] $Arguments,
    [Parameter(Mandatory = $true)][string] $Description
  )

  $result = Invoke-NativeCommand -FileName "aws" -Arguments ($Arguments + @("--region", $Region) + $profileArgs)
  if ($result.ExitCode -ne 0) {
    throw "$Description failed.`n$result.Output"
  }
  return $result
}

function Test-CloudFormationStackExists {
  $result = Invoke-NativeCommand -FileName "aws" -Arguments (@(
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    $stackName,
    "--query",
    "Stacks[0].StackStatus",
    "--output",
    "text",
    "--region",
    $Region
  ) + $profileArgs)

  return $result.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($result.Output)
}

function Get-QueueUrlByName {
  param([Parameter(Mandatory = $true)][string] $QueueName)

  $result = Invoke-NativeCommand -FileName "aws" -Arguments (@(
    "sqs",
    "get-queue-url",
    "--queue-name",
    $QueueName,
    "--query",
    "QueueUrl",
    "--output",
    "text",
    "--region",
    $Region
  ) + $profileArgs)

  if ($result.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($result.Output) -or $result.Output.Trim() -eq "None") {
    return ""
  }

  return $result.Output.Trim()
}

function Remove-SchedulesIfPresent {
  Write-Host "Deleting EventBridge Scheduler schedules/group if present..."

  foreach ($scheduleName in $scheduleNames) {
    Invoke-AwsOptional -Description "delete schedule $scheduleName" -Arguments @(
      "scheduler",
      "delete-schedule",
      "--group-name",
      $scheduleGroupName,
      "--name",
      $scheduleName
    ) | Out-Null
  }

  Invoke-AwsOptional -Description "delete schedule group $scheduleGroupName" -Arguments @(
    "scheduler",
    "delete-schedule-group",
    "--name",
    $scheduleGroupName
  ) | Out-Null
}

function Suspend-EcsServicesIfPresent {
  Write-Host "Scaling ECS services to desiredCount=0 before stack destroy..."

  foreach ($deployableName in $deployableNames) {
    $serviceName = "$resourcePrefix-$deployableName"
    Invoke-AwsOptional -Description "scale ECS service $serviceName to 0" -Arguments @(
      "ecs",
      "update-service",
      "--cluster",
      $clusterName,
      "--service",
      $serviceName,
      "--desired-count",
      "0"
    ) | Out-Null
  }
}

function Destroy-CdkStackIfPresent {
  if (-not (Test-CloudFormationStackExists)) {
    Write-Host "CloudFormation stack $stackName is already absent."
    return
  }

  Write-Host "Destroying CloudFormation/CDK stack $stackName in account $resolvedAccountId region $Region..."
  Invoke-Checked -FileName "npm" -Arguments @("run", "build:cdk") -FailureMessage "CDK build failed before destroy."

  $destroyArgs = @(
    "run",
    "cdk",
    "--",
    "destroy",
    $stackName,
    "-c",
    "environmentName=$Environment",
    "-c",
    "deploymentMode=release",
    "-c",
    "imageTag=$ImageTag",
    "--force"
  ) + $profileArgs

  Invoke-Checked -FileName "npm" -Arguments $destroyArgs -FailureMessage "CDK destroy failed for $stackName. Do not run retained-resource cleanup until the stack destroy is fixed."
}

function Remove-RetainedDynamoDbTable {
  Write-Host "Deleting retained DynamoDB table if present: $tableName"

  $describe = Invoke-NativeCommand -FileName "aws" -Arguments (@(
    "dynamodb",
    "describe-table",
    "--table-name",
    $tableName,
    "--region",
    $Region
  ) + $profileArgs)

  if ($describe.ExitCode -ne 0) {
    Write-Host "DynamoDB table $tableName not found."
    return
  }

  Invoke-AwsOptional -Description "disable deletion protection for $tableName" -Arguments @(
    "dynamodb",
    "update-table",
    "--table-name",
    $tableName,
    "--no-deletion-protection-enabled"
  ) | Out-Null

  Invoke-AwsOptional -Description "delete DynamoDB table $tableName" -Arguments @(
    "dynamodb",
    "delete-table",
    "--table-name",
    $tableName
  ) | Out-Null
}

function Remove-RetainedSqsQueues {
  Write-Host "Deleting retained SQS queues if present..."

  foreach ($queueName in $queueNames) {
    $queueUrl = Get-QueueUrlByName -QueueName $queueName
    if ([string]::IsNullOrWhiteSpace($queueUrl)) {
      Write-Host "SQS queue $queueName not found."
      continue
    }

    Invoke-AwsOptional -Description "delete SQS queue $queueName" -Arguments @(
      "sqs",
      "delete-queue",
      "--queue-url",
      $queueUrl
    ) | Out-Null
  }
}

function Remove-RetainedEcrRepositories {
  Write-Host "Deleting retained ECR repositories if present..."

  foreach ($repositoryName in $repositoryNames) {
    Invoke-AwsOptional -Description "delete ECR repository $repositoryName" -Arguments @(
      "ecr",
      "delete-repository",
      "--repository-name",
      $repositoryName,
      "--force"
    ) | Out-Null
  }
}

function Remove-RetainedLogGroups {
  Write-Host "Deleting retained CloudWatch log groups with prefix /$resourcePrefix/..."

  $result = Invoke-NativeCommand -FileName "aws" -Arguments (@(
    "logs",
    "describe-log-groups",
    "--log-group-name-prefix",
    "/$resourcePrefix/",
    "--query",
    "logGroups[].logGroupName",
    "--output",
    "text",
    "--region",
    $Region
  ) + $profileArgs)

  if ($result.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($result.Output)) {
    Write-Host "No retained CloudWatch log groups found for /$resourcePrefix/."
    return
  }

  $logGroups = $result.Output.Split([char[]]"`t`r`n ", [System.StringSplitOptions]::RemoveEmptyEntries)
  foreach ($logGroupName in $logGroups) {
    Invoke-AwsOptional -Description "delete log group $logGroupName" -Arguments @(
      "logs",
      "delete-log-group",
      "--log-group-name",
      $logGroupName
    ) | Out-Null
  }
}

function Remove-RetainedSsmParameters {
  Write-Host "Deleting retained SSM parameters under /$resourcePrefix/..."

  $result = Invoke-NativeCommand -FileName "aws" -Arguments (@(
    "ssm",
    "describe-parameters",
    "--parameter-filters",
    "Key=Name,Option=BeginsWith,Values=/$resourcePrefix/",
    "--query",
    "Parameters[].Name",
    "--output",
    "text",
    "--region",
    $Region
  ) + $profileArgs)

  if ($result.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($result.Output)) {
    Write-Host "No retained SSM parameters found for /$resourcePrefix/."
    return
  }

  $parameterNames = $result.Output.Split([char[]]"`t`r`n ", [System.StringSplitOptions]::RemoveEmptyEntries)
  for ($i = 0; $i -lt $parameterNames.Count; $i += 10) {
    $batch = $parameterNames[$i..([Math]::Min($i + 9, $parameterNames.Count - 1))]
    Invoke-AwsOptional -Description "delete SSM parameter batch" -Arguments (@(
      "ssm",
      "delete-parameters",
      "--names"
    ) + $batch) | Out-Null
  }
}

function Remove-CloudWatchAlarms {
  Write-Host "Deleting CloudWatch alarms with prefix $resourcePrefix..."

  $result = Invoke-NativeCommand -FileName "aws" -Arguments (@(
    "cloudwatch",
    "describe-alarms",
    "--alarm-name-prefix",
    $resourcePrefix,
    "--query",
    "MetricAlarms[].AlarmName",
    "--output",
    "text",
    "--region",
    $Region
  ) + $profileArgs)

  if ($result.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($result.Output)) {
    Write-Host "No CloudWatch alarms found for prefix $resourcePrefix."
    return
  }

  $alarmNames = $result.Output.Split([char[]]"`t`r`n ", [System.StringSplitOptions]::RemoveEmptyEntries)
  for ($i = 0; $i -lt $alarmNames.Count; $i += 100) {
    $batch = $alarmNames[$i..([Math]::Min($i + 99, $alarmNames.Count - 1))]
    Invoke-AwsOptional -Description "delete CloudWatch alarm batch" -Arguments (@(
      "cloudwatch",
      "delete-alarms",
      "--alarm-names"
    ) + $batch) | Out-Null
  }
}

function Delete-CdkToolkitIfRequested {
  if (-not $DeleteCdkToolkit) {
    Write-Host "Leaving CDKToolkit bootstrap stack intact. Pass -DeleteCdkToolkit only if this AWS account/region is used exclusively for this project."
    return
  }

  Write-Host "Deleting CDKToolkit bootstrap stack because -DeleteCdkToolkit was passed..."
  Invoke-AwsOptional -Description "delete CDKToolkit stack" -Arguments @(
    "cloudformation",
    "delete-stack",
    "--stack-name",
    "CDKToolkit"
  ) | Out-Null
}

function Show-ResidualResources {
  Write-Host ""
  Write-Host "=== Residual resource check for $resourcePrefix ==="

  Invoke-AwsOptional -Description "check CloudFormation stack" -Arguments @(
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    $stackName,
    "--query",
    "Stacks[*].[StackName,StackStatus]",
    "--output",
    "table"
  ) | Out-Null

  Invoke-AwsOptional -Description "check DynamoDB table" -Arguments @(
    "dynamodb",
    "describe-table",
    "--table-name",
    $tableName,
    "--query",
    "Table.[TableName,TableStatus]",
    "--output",
    "table"
  ) | Out-Null

  Invoke-AwsOptional -Description "check ECR repositories" -Arguments @(
    "ecr",
    "describe-repositories",
    "--query",
    "repositories[?starts_with(repositoryName, '$resourcePrefix/')].[repositoryName]",
    "--output",
    "table"
  ) | Out-Null

  Invoke-AwsOptional -Description "check SSM parameters" -Arguments @(
    "ssm",
    "describe-parameters",
    "--parameter-filters",
    "Key=Name,Option=BeginsWith,Values=/$resourcePrefix/",
    "--query",
    "Parameters[].Name",
    "--output",
    "table"
  ) | Out-Null

  Write-Host "=== End residual resource check ==="
}

Write-Host "Destroying LabelLens AWS environment."
Write-Host "Account:     $resolvedAccountId"
Write-Host "Region:      $Region"
Write-Host "Environment: $Environment"
Write-Host "Stack:       $stackName"
Write-Host "Prefix:      $resourcePrefix"
Write-Host ""

Remove-SchedulesIfPresent
Suspend-EcsServicesIfPresent

if (-not $SkipCdkDestroy) {
  Destroy-CdkStackIfPresent
} else {
  Write-Host "Skipping CDK destroy because -SkipCdkDestroy was passed."
}

if (Test-CloudFormationStackExists) {
  throw "CloudFormation stack $stackName still exists after destroy. Aborting retained-resource cleanup to avoid deleting resources still managed by the stack."
}

Remove-CloudWatchAlarms
Remove-RetainedSqsQueues
Remove-RetainedDynamoDbTable
Remove-RetainedEcrRepositories
Remove-RetainedLogGroups
Remove-RetainedSsmParameters
Delete-CdkToolkitIfRequested
Show-ResidualResources

Write-Host "LabelLens AWS environment cleanup completed for $resourcePrefix. Review residual resource check output above."
