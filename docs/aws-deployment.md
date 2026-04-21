# AWS deployment plan

Fase 8 starts the real AWS track by codifying the resources that are already proven locally.

## Current AWS IaC scope

The CDK stack creates:

- `LabelLensTable` equivalent: DynamoDB single-table design with `PK`, `SK` and TTL on `expiresAt`.
- `product.not_found.v1` queue and DLQ with max receive count `3`.
- analytics queue and DLQ with max receive count `5`.
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
- SSM parameters for resource names, ARNs and runtime discovery.

## Why compute is not in this patch

The repo does not yet contain production Dockerfiles or a build/push pipeline for the services and workers. Creating ECS services or Lambda functions now would force the IaC to reference images that do not exist. That would be fake infrastructure.

The next AWS phase should add:

1. one production Dockerfile pattern for Node services/workers,
2. image build/push scripts or CI workflow,
3. ECS/Fargate private services behind gateway,
4. Lambda or containerized workers wired to SQS,
5. least-privilege IAM roles for each service.

## Commands

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
