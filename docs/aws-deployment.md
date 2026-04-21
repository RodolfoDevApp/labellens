# AWS deployment plan

Fase 8 starts the AWS track by codifying the cloud resources already proven by the local enterprise runtime.

## Current AWS IaC scope

The CDK stack creates:

- `LabelLensTable` equivalent: DynamoDB single-table design with `PK`, `SK` and TTL on `expiresAt`.
- `product.not_found.v1` queue and DLQ with max receive count `3`.
- analytics queue and DLQ with max receive count `3`.
- food-cache-refresh queue and DLQ with max receive count `3`.
- product-cache-refresh queue and DLQ with max receive count `3`.
- EventBridge Scheduler group for LabelLens schedules.
- Daily EventBridge Scheduler rules that publish sealed scheduler events to SQS:
  - `cache.refresh.food.requested.v1` at `03:00 UTC`.
  - `cache.refresh.product.requested.v1` at `03:15 UTC`.
- IAM role allowing EventBridge Scheduler to call `sqs:SendMessage` only on the two cache-refresh queues.
- Scheduler target DLQ wiring to the corresponding cache-refresh DLQs.
- CloudWatch alarms for DLQs and queue age.
- ECR repositories for:
  - gateway
  - auth-service
  - food-service
  - product-service
  - menu-service
  - favorites-service
  - product-not-found-worker
  - analytics-worker
  - food-cache-refresh-worker
  - product-cache-refresh-worker
  - dlq-handler
- SSM parameters for resource names, ARNs, schedules and runtime discovery.

## Commands that do not require an AWS account

These commands only compile, test and synthesize the CloudFormation template locally:

```powershell
npm install
npm run build:cdk
npm run test:cdk
npm run synth:cdk
```

For a named environment:

```powershell
npm run synth:cdk -- -c environmentName=staging
```

## When an AWS account becomes required

Create and configure the AWS account before the first real deploy step:

```powershell
aws configure
npm run cdk -- bootstrap
npm run cdk -- deploy
```

Do not run deploy commands until the account, region, billing alerts and bootstrap target are confirmed.

## Next AWS work

1. Add production Dockerfiles for services and workers.
2. Add image build/push automation for the ECR repositories.
3. Add deployed compute for the private services and async workers.
4. Add API Gateway/Cognito/public boundary after compute is deployable.
