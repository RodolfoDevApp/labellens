import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import type { LabelLensAwsConfig } from "../config/label-lens-aws-config.js";
import { LabelLensComputeConstruct } from "../constructs/label-lens-compute-construct.js";
import { LabelLensContainerRepositoriesConstruct } from "../constructs/label-lens-container-repositories-construct.js";
import { LabelLensDataConstruct } from "../constructs/label-lens-data-construct.js";
import { LabelLensIngressConstruct } from "../constructs/label-lens-ingress-construct.js";
import { LabelLensMessagingConstruct } from "../constructs/label-lens-messaging-construct.js";
import { LabelLensOperationalParametersConstruct } from "../constructs/label-lens-operational-parameters-construct.js";
import { LabelLensSchedulesConstruct } from "../constructs/label-lens-schedules-construct.js";

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

    new LabelLensSchedulesConstruct(this, "Schedules", {
      resourcePrefix: props.config.resourcePrefix,
      scheduleGroupName: props.config.schedules.scheduleGroupName,
      foodCacheRefreshSchedule: props.config.schedules.foodCacheRefresh,
      productCacheRefreshSchedule: props.config.schedules.productCacheRefresh,
      foodCacheRefreshQueue: messaging.foodCacheRefreshQueue,
      foodCacheRefreshDeadLetterQueue: messaging.foodCacheRefreshDeadLetterQueue,
      productCacheRefreshQueue: messaging.productCacheRefreshQueue,
      productCacheRefreshDeadLetterQueue: messaging.productCacheRefreshDeadLetterQueue,
    });

    const containerRepositories = new LabelLensContainerRepositoriesConstruct(this, "ContainerRepositories", {
      resourcePrefix: props.config.resourcePrefix,
      repositoryNames: props.config.containerRepositoryNames,
    });

    const compute = new LabelLensComputeConstruct(this, "Compute", {
      resourcePrefix: props.config.resourcePrefix,
      environmentName: props.config.environmentName,
      table: data.table,
      repositories: containerRepositories.repositories,
      queues: {
        productNotFound: messaging.productNotFoundQueue,
        productNotFoundDeadLetter: messaging.productNotFoundDeadLetterQueue,
        analytics: messaging.analyticsQueue,
        analyticsDeadLetter: messaging.analyticsDeadLetterQueue,
        foodCacheRefresh: messaging.foodCacheRefreshQueue,
        foodCacheRefreshDeadLetter: messaging.foodCacheRefreshDeadLetterQueue,
        productCacheRefresh: messaging.productCacheRefreshQueue,
        productCacheRefreshDeadLetter: messaging.productCacheRefreshDeadLetterQueue,
      },
      compute: props.config.compute,
    });

    const gatewayService = compute.services.gateway;

    if (!gatewayService) {
      throw new Error("Missing gateway ECS service for public ingress.");
    }

    const ingress = new LabelLensIngressConstruct(this, "Ingress", {
      resourcePrefix: props.config.resourcePrefix,
      vpc: compute.vpc,
      gatewayService,
      gatewayIngressSecurityGroup: compute.gatewayIngressSecurityGroup,
      ingress: props.config.ingress,
    });

    new LabelLensOperationalParametersConstruct(this, "OperationalParameters", {
      resourcePrefix: props.config.resourcePrefix,
      environmentName: props.config.environmentName,
      deploymentMode: props.config.deployment.mode,
      imageTag: props.config.deployment.imageTag,
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

    new CfnOutput(this, "EcsClusterName", {
      value: compute.cluster.clusterName,
    });

    new CfnOutput(this, "VpcId", {
      value: compute.vpc.vpcId,
    });

    new CfnOutput(this, "GatewayLoadBalancerDnsName", {
      value: ingress.loadBalancer.loadBalancerDnsName,
    });
  }
}
