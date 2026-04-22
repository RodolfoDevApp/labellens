param(
  [string] $Environment = "dev",
  [string] $Region = "us-east-1",
  [string] $Profile = ""
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "aws-deploy-common.ps1")

Assert-Command "aws"

$profileArgs = Get-ProfileArgs -Profile $Profile
$stackName = Get-StackName -Environment $Environment
$resourcePrefix = Get-ResourcePrefix -Environment $Environment
$clusterName = "$resourcePrefix-cluster"

function Invoke-AwsTable {
  param([Parameter(Mandatory = $true)][string[]] $Arguments)

  $result = Invoke-NativeCommand -FileName "aws" -Arguments ($Arguments + @("--region", $Region) + $profileArgs)
  if ($result.ExitCode -ne 0) {
    Write-Host $result.Output
    return
  }

  if (-not [string]::IsNullOrWhiteSpace($result.Output)) {
    Write-Host $result.Output
  }
}

function Get-SsmValue {
  param([Parameter(Mandatory = $true)][string] $Name)

  $result = Invoke-NativeCommand -FileName "aws" -Arguments (@(
    "ssm",
    "get-parameter",
    "--name",
    $Name,
    "--query",
    "Parameter.Value",
    "--output",
    "text",
    "--region",
    $Region
  ) + $profileArgs)

  if ($result.ExitCode -ne 0) {
    return ""
  }

  return $result.Output.Trim()
}

Write-Host "=== LabelLens AWS status ==="
Write-Host "Environment: $Environment"
Write-Host "Region:      $Region"
Write-Host "Stack:       $stackName"
Write-Host "Prefix:      $resourcePrefix"
Write-Host ""

Write-Host "--- CloudFormation stack ---"
Invoke-AwsTable -Arguments @(
  "cloudformation",
  "describe-stacks",
  "--stack-name",
  $stackName,
  "--query",
  "Stacks[*].[StackName,StackStatus,CreationTime,LastUpdatedTime]",
  "--output",
  "table"
)
Write-Host ""

$gatewayUrl = Get-SsmValue -Name "/$resourcePrefix/ingress/gateway-url"
$tableName = Get-SsmValue -Name "/$resourcePrefix/dynamodb/table-name"
Write-Host "--- Public endpoint ---"
if ([string]::IsNullOrWhiteSpace($gatewayUrl)) {
  Write-Host "Gateway URL: not found"
} else {
  Write-Host "Gateway URL: $gatewayUrl"
  Write-Host "Health:      $gatewayUrl/gateway/health"
}
Write-Host ""

Write-Host "--- Data ---"
Write-Host "DynamoDB table: $tableName"
Write-Host ""

Write-Host "--- ECS services ---"
$serviceNames = @(
  "$resourcePrefix-gateway",
  "$resourcePrefix-auth-service",
  "$resourcePrefix-food-service",
  "$resourcePrefix-product-service",
  "$resourcePrefix-menu-service",
  "$resourcePrefix-favorites-service",
  "$resourcePrefix-product-not-found-worker",
  "$resourcePrefix-analytics-worker",
  "$resourcePrefix-food-cache-refresh-worker",
  "$resourcePrefix-product-cache-refresh-worker",
  "$resourcePrefix-dlq-handler"
)
Invoke-AwsTable -Arguments (@(
  "ecs",
  "describe-services",
  "--cluster",
  $clusterName,
  "--services"
) + $serviceNames + @(
  "--query",
  "services[*].[serviceName,status,desiredCount,runningCount,pendingCount]",
  "--output",
  "table"
))
Write-Host ""

Write-Host "--- SQS queues ---"
$queueParameterNames = @(
  "/$resourcePrefix/sqs/product-not-found/queue-url",
  "/$resourcePrefix/sqs/analytics/queue-url",
  "/$resourcePrefix/sqs/food-cache-refresh/queue-url",
  "/$resourcePrefix/sqs/product-cache-refresh/queue-url"
)
foreach ($parameterName in $queueParameterNames) {
  $queueUrl = Get-SsmValue -Name $parameterName
  if ([string]::IsNullOrWhiteSpace($queueUrl)) {
    Write-Host "$parameterName not found"
    continue
  }

  Invoke-AwsTable -Arguments @(
    "sqs",
    "get-queue-attributes",
    "--queue-url",
    $queueUrl,
    "--attribute-names",
    "ApproximateNumberOfMessages",
    "ApproximateNumberOfMessagesNotVisible",
    "ApproximateNumberOfMessagesDelayed",
    "--query",
    "Attributes",
    "--output",
    "table"
  )
}
Write-Host ""

Write-Host "--- EventBridge Scheduler ---"
Invoke-AwsTable -Arguments @(
  "scheduler",
  "list-schedules",
  "--group-name",
  "$resourcePrefix-schedules",
  "--query",
  "Schedules[*].[Name,State,ScheduleExpression]",
  "--output",
  "table"
)
Write-Host ""

Write-Host "--- ALB target health ---"
$targetGroupArn = Get-SsmValue -Name "/$resourcePrefix/ingress/gateway-alb/target-group-arn"
if ([string]::IsNullOrWhiteSpace($targetGroupArn)) {
  Write-Host "Target group ARN not found"
} else {
  Invoke-AwsTable -Arguments @(
    "elbv2",
    "describe-target-health",
    "--target-group-arn",
    $targetGroupArn,
    "--query",
    "TargetHealthDescriptions[*].[Target.Id,Target.Port,TargetHealth.State,TargetHealth.Reason,TargetHealth.Description]",
    "--output",
    "table"
  )
}
