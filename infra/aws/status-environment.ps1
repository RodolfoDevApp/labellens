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
  if ($result.ExitCode -ne 0) { Write-Host $result.Output; return }
  if (-not [string]::IsNullOrWhiteSpace($result.Output)) { Write-Host $result.Output }
}

function Get-SsmValue {
  param([Parameter(Mandatory = $true)][string] $Name)
  $result = Invoke-NativeCommand -FileName "aws" -Arguments @("ssm","get-parameter","--name",$Name,"--query","Parameter.Value","--output","text","--region",$Region) + $profileArgs
  if ($result.ExitCode -ne 0) { return "" }
  return $result.Output.Trim()
}

Write-Host "=== LabelLens AWS status ==="
Write-Host "Environment: $Environment"
Write-Host "Region:      $Region"
Write-Host "Stack:       $stackName"
Write-Host "Prefix:      $resourcePrefix"
Write-Host ""

Write-Host "--- CloudFormation stack ---"
Invoke-AwsTable -Arguments @("cloudformation","describe-stacks","--stack-name",$stackName,"--query","Stacks[*].[StackName,StackStatus,CreationTime,LastUpdatedTime]","--output","table")
Write-Host ""

$apiUrl = Get-SsmValue -Name "/$resourcePrefix/apigateway/http-api/url"
$tableName = Get-SsmValue -Name "/$resourcePrefix/dynamodb/table-name"
$userPoolId = Get-SsmValue -Name "/$resourcePrefix/cognito/user-pool-id"
$userPoolClientId = Get-SsmValue -Name "/$resourcePrefix/cognito/user-pool-client-id"

Write-Host "--- Public backend endpoint ---"
if ([string]::IsNullOrWhiteSpace($apiUrl)) {
  Write-Host "API Gateway URL: not found"
} else {
  Write-Host "API Gateway URL: $apiUrl"
  Write-Host "Health:          $apiUrl/api/v1/health"
}
Write-Host ""

Write-Host "--- Auth ---"
Write-Host "Cognito user pool:        $userPoolId"
Write-Host "Cognito user pool client: $userPoolClientId"
Write-Host ""

Write-Host "--- Data ---"
Write-Host "DynamoDB table: $tableName"
Write-Host ""

Write-Host "--- ECS services ---"
$serviceNames = @("$resourcePrefix-gateway","$resourcePrefix-auth-service","$resourcePrefix-food-service","$resourcePrefix-product-service","$resourcePrefix-menu-service","$resourcePrefix-favorites-service")
Invoke-AwsTable -Arguments (@("ecs","describe-services","--cluster",$clusterName,"--services") + $serviceNames + @("--query","services[*].[serviceName,status,desiredCount,runningCount,pendingCount]","--output","table"))
Write-Host ""

Write-Host "--- Lambda consumers ---"
Invoke-AwsTable -Arguments @("lambda","list-functions","--query","Functions[?starts_with(FunctionName, '$resourcePrefix-')].[FunctionName,Runtime,State,ReservedConcurrentExecutions]","--output","table")
Write-Host ""

Write-Host "--- API Gateway ---"
$httpApiId = Get-SsmValue -Name "/$resourcePrefix/apigateway/http-api/id"
$vpcLinkId = Get-SsmValue -Name "/$resourcePrefix/apigateway/http-api/vpc-link-id"
$authorizerId = Get-SsmValue -Name "/$resourcePrefix/apigateway/http-api/authorizer-id"
Write-Host "HTTP API ID:   $httpApiId"
Write-Host "VPC Link ID:   $vpcLinkId"
Write-Host "Authorizer ID: $authorizerId"
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
  if ([string]::IsNullOrWhiteSpace($queueUrl)) { Write-Host "$parameterName not found"; continue }
  Invoke-AwsTable -Arguments @("sqs","get-queue-attributes","--queue-url",$queueUrl,"--attribute-names","ApproximateNumberOfMessages","ApproximateNumberOfMessagesNotVisible","ApproximateNumberOfMessagesDelayed","--query","Attributes","--output","table")
}
Write-Host ""

Write-Host "--- EventBridge Scheduler ---"
Invoke-AwsTable -Arguments @("scheduler","list-schedules","--group-name","$resourcePrefix-schedules","--query","Schedules[*].[Name,State,ScheduleExpression]","--output","table")
Write-Host ""

Write-Host "--- Internal ALB target health ---"
$targetGroupArn = Get-SsmValue -Name "/$resourcePrefix/ingress/gateway-alb/target-group-arn"
if ([string]::IsNullOrWhiteSpace($targetGroupArn)) {
  Write-Host "Target group ARN not found"
} else {
  Invoke-AwsTable -Arguments @("elbv2","describe-target-health","--target-group-arn",$targetGroupArn,"--query","TargetHealthDescriptions[*].[Target.Id,Target.Port,TargetHealth.State,TargetHealth.Reason,TargetHealth.Description]","--output","table")
}
