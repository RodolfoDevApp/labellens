# LabelLens AWS deployment

## Target AWS shape for v1

LabelLens `dev` is deployed as an AWS CDK stack named `LabelLens-dev`.

The async runtime is now aligned with the sealed v1 plan: HTTP business services run on ECS/Fargate, and SQS consumers run as AWS Lambda functions with SQS event source mappings.

Current backend ingress is still the gateway behind ALB while the next corrective phase adds API Gateway, Cognito and VPC Link. Do not call this production-complete until that phase is done.

## Main AWS resource map

| Project concept | AWS resource |
| --- | --- |
| Gateway and HTTP microservices | Amazon ECS on AWS Fargate |
| Async consumers | AWS Lambda + SQS event source mappings |
| Container registry for HTTP services | Amazon ECR |
| Current backend ingress | Application Load Balancer to gateway |
| Target public backend ingress | API Gateway HTTP API + Cognito + VPC Link |
| Internal service discovery | AWS Cloud Map private DNS namespace |
| Database / single table | Amazon DynamoDB |
| Message queues / async bus | Amazon SQS queues + DLQs |
| Scheduled cache refresh | Amazon EventBridge Scheduler publishing to SQS |
| Configuration registry | AWS Systems Manager Parameter Store |
| Metrics and alarms | Amazon CloudWatch |
| Infra-as-code | AWS CDK / CloudFormation |

## Lambda consumers

| Lambda | Trigger | Notes |
| --- | --- | --- |
| `product-not-found-handler` | `product-not-found` SQS queue | Records product-not-found operational events idempotently. |
| `analytics-consumer` | `analytics` SQS queue | Records internal analytics events idempotently. |
| `food-cache-refresh` | `food-cache-refresh` SQS queue | Calls the private food-service cache refresh route. |
| `product-cache-refresh` | `product-cache-refresh` SQS queue | Calls the private product-service cache refresh route. |
| `dlq-handler` | all four DLQs | Records DLQ payloads for debugging; no automatic redrive in v1. |

All Lambda event source mappings use:

- `batchSize = 10`
- `maximumBatchingWindow = 5 seconds`
- partial batch response enabled through `ReportBatchItemFailures`
- reserved concurrency `2` per consumer

## Useful commands

```powershell
npm run aws:status -- -Environment dev -Region us-east-1
npm run aws:smoke -- -Environment dev -Region us-east-1
npm run aws:pause -- -Environment dev -Region us-east-1
npm run aws:resume -- -Environment dev -Region us-east-1 -ImageTag latest -Smoke
npm run aws:destroy -- -Environment dev -Region us-east-1 -Force
```

`aws:pause` is a soft pause. It scales ECS/Fargate services to zero through CDK bootstrap mode. It does not delete ALB, NAT Gateway, DynamoDB, SQS, Lambda functions, ECR or CloudWatch resources.

`aws:destroy` is the cleanup path for a deployed dev environment. It runs CDK destroy and then attempts to remove retained project resources.

## Console navigation

- CloudFormation: search `CloudFormation`, open stack `LabelLens-dev`.
- ECS: search `Elastic Container Service`, open cluster `labellens-dev-cluster`, then Services.
- Lambda: search `Lambda`, open functions starting with `labellens-dev-`.
- ECR: search `Elastic Container Registry`, open repositories starting with `labellens-dev/`.
- DynamoDB: search `DynamoDB`, open table `labellens-dev-table`.
- SQS: search `Simple Queue Service`, open queues starting with `labellens-dev-`.
- EventBridge Scheduler: search `EventBridge Scheduler`, open group `labellens-dev-schedules`.
- Systems Manager Parameter Store: search parameters under `/labellens-dev/`.
- CloudWatch: inspect logs under `/labellens-dev/ecs/` and `/labellens-dev/lambda/`.
