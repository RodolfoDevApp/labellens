# LabelLens AWS CDK

This workspace models the AWS resources that already exist in the local enterprise stack. It does not invent routes or services.

## Phase 8 scope

This phase creates the AWS foundation that can be deployed without assuming built container images already exist:

- DynamoDB single table with `PK`, `SK`, `expiresAt`, on-demand billing, point-in-time recovery and deletion protection.
- SQS queues and DLQs for the two closed async flows:
  - `product.not_found.v1` -> `product-not-found-worker`
  - analytics events -> `analytics-worker`
- CloudWatch alarms for DLQ messages and old queue messages.
- ECR repositories for every deployable service and worker.
- SSM parameters for resource discovery by deployment automation.

Compute deployment is intentionally not faked in this phase. ECS services and Lambda functions require container images to exist first. That belongs to the next phase after service Dockerfiles and image publishing are sealed.

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
2. Deploy this foundation stack.
3. Build and push service and worker images to the generated ECR repositories.
4. Add runtime compute stack for gateway, private services and SQS-triggered workers.

## Non-goals in this phase

- No public microservice endpoints.
- No placeholder ECS tasks.
- No dummy Lambda image references.
- No API routes beyond the existing `/api/v1` contract.
