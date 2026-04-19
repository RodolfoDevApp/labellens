# CDK scaffold

Planned stack after repository ports are stable:

- HTTP entrypoints for `food-service`, `product-service`, `menu-service` and `favorites-service`
- DynamoDB single table
- Cognito User Pool
- SQS queues and DLQs
- EventBridge schedules
- Lambda jobs for cache refresh, missing-product tracking, analytics and DLQ handling
- CloudWatch alarms

Do not deploy a Lambda-only backend as the final shape. Business APIs should stay as microservice boundaries; Lambdas are for background work.
