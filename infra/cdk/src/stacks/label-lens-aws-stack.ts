import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import type { LabelLensAwsConfig } from "../config/label-lens-aws-config.js";
import { LabelLensContainerRepositoriesConstruct } from "../constructs/label-lens-container-repositories-construct.js";
import { LabelLensDataConstruct } from "../constructs/label-lens-data-construct.js";
import { LabelLensMessagingConstruct } from "../constructs/label-lens-messaging-construct.js";
import { LabelLensOperationalParametersConstruct } from "../constructs/label-lens-operational-parameters-construct.js";

export type LabelLensAwsStackProps = StackProps & {
  config: LabelLensAwsConfig;
};

export class LabelLensAwsStack extends Stack {
  constructor(scope: Construct, id: string, props: LabelLensAwsStackProps) {
    super(scope, id, props);

    const data = new LabelLensDataConstruct(this, "Data", {
      tableName: props.config.tableName,
      resourcePrefix: props.config.resourcePrefix,
    });

    const messaging = new LabelLensMessagingConstruct(this, "Messaging", {
      resourcePrefix: props.config.resourcePrefix,
      productNotFoundQueue: props.config.queues.productNotFound,
      analyticsQueue: props.config.queues.analytics,
      foodCacheRefreshQueue: props.config.queues.foodCacheRefresh,
      productCacheRefreshQueue: props.config.queues.productCacheRefresh,
    });

    new LabelLensContainerRepositoriesConstruct(this, "ContainerRepositories", {
      resourcePrefix: props.config.resourcePrefix,
      repositoryNames: props.config.containerRepositoryNames,
    });

    new LabelLensOperationalParametersConstruct(this, "OperationalParameters", {
      resourcePrefix: props.config.resourcePrefix,
      environmentName: props.config.environmentName,
    });

    new CfnOutput(this, "LabelLensTableName", {
      value: data.table.tableName,
    });

    new CfnOutput(this, "ProductNotFoundQueueUrl", {
      value: messaging.productNotFoundQueue.queueUrl,
    });

    new CfnOutput(this, "AnalyticsQueueUrl", {
      value: messaging.analyticsQueue.queueUrl,
    });

    new CfnOutput(this, "FoodCacheRefreshQueueUrl", {
      value: messaging.foodCacheRefreshQueue.queueUrl,
    });

    new CfnOutput(this, "ProductCacheRefreshQueueUrl", {
      value: messaging.productCacheRefreshQueue.queueUrl,
    });
  }
}
