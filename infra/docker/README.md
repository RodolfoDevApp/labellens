# LabelLens container foundation

The AWS container path builds only the HTTP boundary that still runs on ECS/Fargate:

- gateway
- auth-service
- food-service
- product-service
- menu-service
- favorites-service

Async consumers are not container deployables in AWS. They run as Lambda functions wired to SQS event source mappings. The local development compose file may still run worker containers as local runners; that does not define the AWS runtime.

## Check the foundation

```powershell
npm run containers:check
```

## Build one local image

```powershell
npm run containers:build -- -Image gateway -Tag local
```

## Build all local images

```powershell
npm run containers:build -- -Tag local
```

## Tag images for ECR later

This requires an AWS account id, but does not push anything:

```powershell
npm run containers:tag -- -AccountId 123456789012 -Region us-east-1 -Environment dev -LocalTag local -RemoteTag latest
```

## Push images later

This requires AWS CLI credentials and existing ECR repositories from CDK:

```powershell
npm run containers:push -- -AccountId 123456789012 -Region us-east-1 -Environment dev -RemoteTag latest
```

## First AWS deploy interaction

The AWS deploy flow builds and pushes these six HTTP service images only. Lambda consumers are bundled by CDK from `apps/lambdas/src/handlers` during synth/deploy.
