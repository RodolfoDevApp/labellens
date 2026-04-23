import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import type { LabelLensAwsConfig } from "../config/label-lens-aws-config.js";
import { LabelLensApiGatewayConstruct } from "../constructs/label-lens-api-gateway-construct.js";
import { LabelLensAuthConstruct } from "../constructs/label-lens-auth-construct.js";
import { LabelLensComputeConstruct } from "../constructs/label-lens-compute-construct.js";
import { LabelLensContainerRepositoriesConstruct } from "../constructs/label-lens-container-repositories-construct.js";
import { LabelLensDataConstruct } from "../constructs/label-lens-data-construct.js";
import { LabelLensIngressConstruct } from "../constructs/label-lens-ingress-construct.js";
import { LabelLensLambdaConsumersConstruct } from "../constructs/label-lens-lambda-consumers-construct.js";
import { LabelLensMessagingConstruct } from "../constructs/label-lens-messaging-construct.js";
import { LabelLensOperationalParametersConstruct } from "../constructs/label-lens-operational-parameters-construct.js";
import { LabelLensSchedulesConstruct } from "../constructs/label-lens-schedules-construct.js";
import { LabelLensWebHostingConstruct } from "../constructs/label-lens-web-hosting-construct.js";

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

    const auth = new LabelLensAuthConstruct(this, "Auth", {
      resourcePrefix: props.config.resourcePrefix,
      auth: props.config.auth,
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

    new LabelLensLambdaConsumersConstruct(this, "LambdaConsumers", {
      resourcePrefix: props.config.resourcePrefix,
      table: data.table,
      vpc: compute.vpc,
      serviceSecurityGroup: compute.serviceSecurityGroup,
      privateDnsNamespaceName: props.config.compute.privateDnsNamespaceName,
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
    });

    const gatewayService = compute.services.gateway;
    if (!gatewayService) {
      throw new Error("Missing gateway ECS service for API ingress.");
    }

    const ingress = new LabelLensIngressConstruct(this, "Ingress", {
      resourcePrefix: props.config.resourcePrefix,
      vpc: compute.vpc,
      gatewayService,
      gatewayIngressSecurityGroup: compute.gatewayIngressSecurityGroup,
      ingress: props.config.ingress,
    });

    const apiGateway = new LabelLensApiGatewayConstruct(this, "ApiGateway", {
      resourcePrefix: props.config.resourcePrefix,
      vpc: compute.vpc,
      apiGateway: props.config.apiGateway,
      listener: ingress.httpListener,
      issuerUrl: auth.issuerUrl,
      audience: auth.userPoolClient.userPoolClientId,
    });

    apiGateway.addIngressRuleFromApiGatewayToAlb(ingress.loadBalancerSecurityGroup, props.config.ingress.httpPort);


    const webHosting = new LabelLensWebHostingConstruct(this, "WebHosting", {
      resourcePrefix: props.config.resourcePrefix,
      web: props.config.web,
    });

    new LabelLensOperationalParametersConstruct(this, "OperationalParameters", {
      resourcePrefix: props.config.resourcePrefix,
      environmentName: props.config.environmentName,
      deploymentMode: props.config.deployment.mode,
      imageTag: props.config.deployment.imageTag,
    });

    new CfnOutput(this, "LabelLensTableName", { value: data.table.tableName });
    new CfnOutput(this, "ProductNotFoundQueueUrl", { value: messaging.productNotFoundQueue.queueUrl });
    new CfnOutput(this, "AnalyticsQueueUrl", { value: messaging.analyticsQueue.queueUrl });
    new CfnOutput(this, "FoodCacheRefreshQueueUrl", { value: messaging.foodCacheRefreshQueue.queueUrl });
    new CfnOutput(this, "ProductCacheRefreshQueueUrl", { value: messaging.productCacheRefreshQueue.queueUrl });
    new CfnOutput(this, "EcsClusterName", { value: compute.cluster.clusterName });
    new CfnOutput(this, "VpcId", { value: compute.vpc.vpcId });
    new CfnOutput(this, "HttpApiUrl", { value: apiGateway.httpApi.apiEndpoint });
    new CfnOutput(this, "WebsiteUrl", { value: `https://${webHosting.distribution.distributionDomainName}` });
  }
}
