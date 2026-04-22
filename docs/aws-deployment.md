# AWS deployment plan

Fase 8 codifies the AWS track from the local enterprise runtime that already passed LocalStack, SQS, workers and DLQ smokes.

## Current AWS IaC scope

The CDK stack creates:

- DynamoDB single-table design with `PK`, `SK`, TTL on `expiresAt`, on-demand billing and PITR.
- Four sealed source queues plus four DLQs with `maxReceiveCount = 3`:
  - product-not-found
  - analytics
  - food-cache-refresh
  - product-cache-refresh
- EventBridge Scheduler group.
- Daily EventBridge Scheduler schedules that publish sealed scheduler events to SQS:
  - `cache.refresh.food.requested.v1` at `03:00 UTC`.
  - `cache.refresh.product.requested.v1` at `03:15 UTC`.
- IAM role allowing EventBridge Scheduler to call `sqs:SendMessage` only on the two cache-refresh queues.
- Scheduler target DLQ wiring to the corresponding cache-refresh DLQs.
- CloudWatch alarms for DLQs and queue age.
- ECR repositories for all services and workers.
- VPC with public and private-with-egress subnets.
- ECS cluster with container insights enabled.
- Shared ECS service security group for private service-to-service HTTP.
- Private DNS namespace for future ECS service discovery.
- Fargate task definitions for all 11 deployable containers.
- ECS Fargate services for all 11 deployable services and workers.
- Cloud Map service discovery for the six HTTP services using A records in the private namespace.
- Private subnet placement with no public IP assignment for every ECS service.
- Shared service security group allowing only LabelLens private service-to-service HTTP range.
- CloudWatch log groups for every service and worker.
- Runtime environment wiring for DynamoDB, SQS queues and private service URLs.
- Task role grants for DynamoDB read/write plus only the SQS send/consume permissions each service or worker needs.
- SSM parameters for resource names, ARNs, schedules, VPC, ECS cluster, namespace, task definition ARNs and ECS service names/ARNs.

## Phase 8B container foundation

The repository includes production-style container foundation files under `infra/docker`:

- `Dockerfile.node`: shared multi-stage Node 24 Dockerfile for services and workers.
- `services.json`: deployable image manifest matching the CDK ECR repository names.
- `build-images.ps1`: local Docker image build script.
- `tag-images.ps1`: future ECR tag script.
- `push-images.ps1`: future ECR push script.
- `check-container-foundation.ps1`: static validation for Dockerfile, manifest and package start scripts.

Local checks do not require AWS:

```powershell
npm run containers:check
npm run containers:build -- -Tag local
```

ECR tagging/pushing requires an AWS account, AWS CLI credentials and CDK-created ECR repositories:

```powershell
npm run containers:tag -- -AccountId 123456789012 -Region us-east-1 -Environment dev -LocalTag local -RemoteTag latest
npm run containers:push -- -AccountId 123456789012 -Region us-east-1 -Environment dev -RemoteTag latest
```

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

## Phase 8D ECS services and service discovery

Phase 8D turns the task definitions into deployable ECS Fargate services while still avoiding real AWS deployment. The CDK template now synthesizes private ECS services for the gateway, five private HTTP services and five async workers. HTTP services are registered in the private Cloud Map namespace using A records so internal URLs remain stable, for example `http://product-service.labellens-dev.local:4102`.

Workers are also ECS Fargate services, but they are not registered in Cloud Map because no other container calls them over HTTP. They run in private subnets without public IPs and receive only their required SQS/DynamoDB permissions.

## Next AWS work

1. Add public ingress for the gateway through API Gateway/ALB/VPC Link or the selected final boundary.
2. Add Cognito/JWT authorization at the public boundary.
3. Add deployment-time image tag strategy and environment overrides.
4. Deploy, tag and push images to ECR once the AWS account is ready.
