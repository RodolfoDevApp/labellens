# LabelLens AWS deployment scripts

## First deploy

```powershell
npm run aws:prereqs -- -Region us-east-1
npm run aws:first-deploy -- -Environment dev -Region us-east-1 -ImageTag latest
npm run aws:smoke -- -Environment dev -Region us-east-1
```

## Day-2 operations

Show stack, website URL, gateway URL, ECS services, queues, schedules and ALB target health:

```powershell
npm run aws:status -- -Environment dev -Region us-east-1
```

Soft-pause the environment by deploying the existing bootstrap mode. This keeps the stack but sets ECS/Fargate services to `desiredCount=0` and disables service autoscaling created by the release mode:

```powershell
npm run aws:pause -- -Environment dev -Region us-east-1
```

Resume the environment with the last image tag:

```powershell
npm run aws:resume -- -Environment dev -Region us-east-1 -ImageTag latest -Smoke
```

## Cost note

`aws:pause` stops ECS task runtime cost, but it does not delete the stack. The ALB, NAT Gateway, CloudWatch logs, DynamoDB table, SQS queues, ECR repositories and SSM parameters remain. This is intentional so the environment can be resumed cleanly from CDK without re-importing retained resources.

## Full destroy / cleanup

Use this when the deployed AWS shape must be removed before rebuilding against the sealed plan.

```powershell
npm run aws:destroy -- -Environment dev -Region us-east-1 -Force
```

With an explicit AWS profile and account guard:

```powershell
npm run aws:destroy -- -Environment dev -Region us-east-1 -Profile your-profile -AccountId 445363793591 -Force
```

What it does:

1. Deletes/attempts to delete the EventBridge Scheduler schedules and schedule group.
2. Scales ECS services to `desiredCount=0`.
3. Runs `cdk destroy LabelLens-dev`.
4. Deletes retained LabelLens resources left by the current CDK policies: DynamoDB table, SQS queues/DLQs, ECR repositories, CloudWatch log groups, CloudWatch alarms and SSM parameters under the project prefix.
5. Leaves `CDKToolkit` intact by default. Only pass `-DeleteCdkToolkit` if the account/region is dedicated to this project.

The script requires `-Force` so it cannot be run accidentally.
