# LabelLens AWS deployment

## Current deployed shape

LabelLens `dev` is deployed as an AWS CDK stack named `LabelLens-dev`.

The public boundary is the Application Load Balancer. Only the `gateway` ECS/Fargate service is reachable from the internet. Internal services and workers are private ECS/Fargate services in private subnets.

## Main AWS resource map

| Project concept | AWS resource |
| --- | --- |
| Microservices and workers | Amazon ECS on AWS Fargate |
| Container registry | Amazon ECR |
| Public ingress | Application Load Balancer |
| Internal service discovery | AWS Cloud Map private DNS namespace |
| Database / single table | Amazon DynamoDB |
| Message queues / async bus | Amazon SQS queues + DLQs |
| Scheduled cache refresh | Amazon EventBridge Scheduler publishing to SQS |
| Configuration registry | AWS Systems Manager Parameter Store |
| Metrics and alarms | Amazon CloudWatch |
| Infra-as-code | AWS CDK / CloudFormation |

There are no Lambda functions in the current phase. The deployable runtime is container-based: six HTTP services and five workers running on ECS/Fargate.

## Useful commands

```powershell
npm run aws:status -- -Environment dev -Region us-east-1
npm run aws:smoke -- -Environment dev -Region us-east-1
npm run aws:pause -- -Environment dev -Region us-east-1
npm run aws:resume -- -Environment dev -Region us-east-1 -ImageTag latest -Smoke
```

`aws:pause` is a soft pause. It scales ECS/Fargate services to zero through CDK bootstrap mode. It does not delete ALB, NAT Gateway, DynamoDB, SQS, ECR or CloudWatch resources.

## Console navigation

- CloudFormation: search `CloudFormation`, open stack `LabelLens-dev`.
- ECS: search `Elastic Container Service`, open cluster `labellens-dev-cluster`, then Services.
- ECR: search `Elastic Container Registry`, open repositories starting with `labellens-dev/`.
- DynamoDB: search `DynamoDB`, open table `labellens-dev-table`.
- SQS: search `Simple Queue Service`, open queues starting with `labellens-dev-`.
- EventBridge Scheduler: search `EventBridge Scheduler`, open schedule group `labellens-dev-schedules`.
- Parameter Store: search `Systems Manager`, then `Parameter Store`, filter `/labellens-dev/`.
- CloudWatch: search `CloudWatch`, then `Log groups` and `Alarms`, filter `labellens-dev`.
- ALB: search `EC2`, then `Load Balancers`, find the load balancer whose DNS is exported by the stack.
