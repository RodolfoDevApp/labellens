# LabelLens container foundation

Phase 8B prepares production-style Node container images for the deployable backend boundary:

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

The local development compose file still uses `node:24-bookworm-slim` with mounted source and `dev:*` scripts. These images are for the AWS/ECR path.

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

Phase 8G wraps these container scripts in `npm run aws:first-deploy`: first CDK deploys infrastructure in `bootstrap` mode, then images are built/tagged/pushed, then CDK deploys `release` mode with the selected image tag.
