# LabelLens AWS CDK

This workspace models the AWS resources for the sealed v1 architecture. It does not invent routes, product features or alternate runtimes.

## Current AWS scope

This CDK stack creates:

- DynamoDB single table with `PK`, `SK`, `expiresAt`, on-demand billing, point-in-time recovery and deletion protection.
- SQS Standard queues and DLQs for the closed async flows.
- EventBridge Scheduler rules that publish refresh requests to SQS.
- ECS/Fargate compute only for the gateway and HTTP microservices.
- Lambda consumers for async SQS processing:
  - `product-not-found-handler`
  - `analytics-consumer`
  - `food-cache-refresh`
  - `product-cache-refresh`
  - `dlq-handler`
- SQS event source mappings with batch size 10, maximum batching window 5 seconds and partial batch response enabled.
- ECR repositories only for HTTP services that run on ECS/Fargate.
- SSM parameters for resource discovery by deployment automation.

## Commands

```powershell
npm install
npm run build:cdk
npm run test:cdk
npm run synth:cdk
```

To synthesize for another environment:

```powershell
npm run synth:cdk -- -c environmentName=staging
```

## Deploy order

1. Bootstrap the AWS account/region if needed.
2. Deploy infrastructure in bootstrap mode if ECR images do not exist yet.
3. Build and push the six HTTP service images to ECR.
4. Deploy release mode with ECS HTTP services and Lambda SQS consumers.

## Non-goals in this phase

- No public microservice endpoints.
- No ECS/Fargate workers for async consumers.
- No API Gateway/Cognito/VPC Link yet; that is the next corrective phase.
- No product features beyond the existing `/api/v1` contract.
