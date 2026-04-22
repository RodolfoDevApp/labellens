import { CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
  Cluster,
  ContainerImage,
  ContainerInsights,
  FargateService,
  FargateTaskDefinition,
  LogDrivers,
  PropagatedTagSource,
  Protocol,
} from "aws-cdk-lib/aws-ecs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { DnsRecordType, PrivateDnsNamespace } from "aws-cdk-lib/aws-servicediscovery";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import type { ComputeConfig, DeployableContainerConfig } from "../config/label-lens-aws-config.js";

export type LabelLensComputeConstructProps = {
  resourcePrefix: string;
  environmentName: string;
  table: Table;
  repositories: Record<string, Repository>;
  queues: {
    productNotFound: Queue;
    productNotFoundDeadLetter: Queue;
    analytics: Queue;
    analyticsDeadLetter: Queue;
    foodCacheRefresh: Queue;
    foodCacheRefreshDeadLetter: Queue;
    productCacheRefresh: Queue;
    productCacheRefreshDeadLetter: Queue;
  };
  compute: ComputeConfig;
};

export class LabelLensComputeConstruct extends Construct {
  readonly vpc: Vpc;
  readonly serviceSecurityGroup: SecurityGroup;
  readonly gatewayIngressSecurityGroup: SecurityGroup;
  readonly cluster: Cluster;
  readonly privateDnsNamespace: PrivateDnsNamespace;
  readonly taskDefinitions: Record<string, FargateTaskDefinition> = {};
  readonly services: Record<string, FargateService> = {};

  constructor(scope: Construct, id: string, props: LabelLensComputeConstructProps) {
    super(scope, id);

    this.vpc = new Vpc(this, "Vpc", {
      vpcName: props.compute.vpcName,
      maxAzs: props.compute.maxAzs,
      natGateways: props.compute.natGateways,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    this.serviceSecurityGroup = new SecurityGroup(this, "ServiceSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: props.compute.serviceSecurityGroupName,
      description: "Allows LabelLens ECS tasks to call each other inside the private VPC.",
      allowAllOutbound: true,
      disableInlineRules: true,
    });

    this.gatewayIngressSecurityGroup = new SecurityGroup(this, "GatewayIngressSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: props.compute.gatewayIngressSecurityGroupName,
      description: "Allows the public load balancer to reach only the LabelLens gateway task.",
      allowAllOutbound: true,
      disableInlineRules: true,
    });

    this.serviceSecurityGroup.addIngressRule(
      Peer.securityGroupId(this.serviceSecurityGroup.securityGroupId),
      Port.tcpRange(4000, 4105),
      "Allow LabelLens private service-to-service HTTP traffic.",
    );

    this.serviceSecurityGroup.addIngressRule(
      Peer.securityGroupId(this.gatewayIngressSecurityGroup.securityGroupId),
      Port.tcpRange(4101, 4105),
      "Allow the gateway to call private LabelLens HTTP services.",
    );

    this.cluster = new Cluster(this, "Cluster", {
      clusterName: props.compute.clusterName,
      containerInsightsV2: ContainerInsights.ENABLED,
      vpc: this.vpc,
    });

    this.privateDnsNamespace = new PrivateDnsNamespace(this, "PrivateDnsNamespace", {
      name: props.compute.privateDnsNamespaceName,
      vpc: this.vpc,
      description: "Private DNS namespace for LabelLens service discovery.",
    });

    for (const deployable of props.compute.deployables) {
      this.taskDefinitions[deployable.name] = this.createTaskDefinition(props, deployable);
    }

    for (const deployable of props.compute.deployables) {
      const taskDefinition = this.taskDefinitions[deployable.name];

      if (!taskDefinition) {
        throw new Error(`Missing task definition for ${deployable.name}.`);
      }

      this.services[deployable.name] = this.createFargateService(props, deployable, taskDefinition);
    }

    new StringParameter(this, "VpcIdParameter", {
      parameterName: `/${props.resourcePrefix}/network/vpc-id`,
      stringValue: this.vpc.vpcId,
    });

    new StringParameter(this, "ServiceSecurityGroupIdParameter", {
      parameterName: `/${props.resourcePrefix}/network/service-security-group-id`,
      stringValue: this.serviceSecurityGroup.securityGroupId,
    });

    new StringParameter(this, "GatewayIngressSecurityGroupIdParameter", {
      parameterName: `/${props.resourcePrefix}/network/gateway-ingress-security-group-id`,
      stringValue: this.gatewayIngressSecurityGroup.securityGroupId,
    });

    new StringParameter(this, "ClusterNameParameter", {
      parameterName: `/${props.resourcePrefix}/ecs/cluster-name`,
      stringValue: props.compute.clusterName,
    });

    new StringParameter(this, "ClusterArnParameter", {
      parameterName: `/${props.resourcePrefix}/ecs/cluster-arn`,
      stringValue: this.cluster.clusterArn,
    });

    new StringParameter(this, "PrivateDnsNamespaceNameParameter", {
      parameterName: `/${props.resourcePrefix}/service-discovery/private-dns-namespace-name`,
      stringValue: props.compute.privateDnsNamespaceName,
    });

    new CfnOutput(this, "ClusterName", {
      value: this.cluster.clusterName,
    });

    new CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
    });
  }

  private createTaskDefinition(
    props: LabelLensComputeConstructProps,
    deployable: DeployableContainerConfig,
  ): FargateTaskDefinition {
    const repository = props.repositories[`${props.resourcePrefix}/${deployable.name}`];

    if (!repository) {
      throw new Error(`Missing ECR repository for ${deployable.name}.`);
    }

    const constructId = toConstructId(deployable.name);
    const taskDefinition = new FargateTaskDefinition(this, `${constructId}TaskDefinition`, {
      family: `${props.resourcePrefix}-${deployable.name}`,
      cpu: deployable.cpu ?? props.compute.defaultTask.cpu,
      memoryLimitMiB: deployable.memoryLimitMiB ?? props.compute.defaultTask.memoryLimitMiB,
    });

    const logGroup = new LogGroup(this, `${constructId}LogGroup`, {
      logGroupName: `/${props.resourcePrefix}/ecs/${deployable.name}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const container = taskDefinition.addContainer(`${constructId}Container`, {
      containerName: deployable.name,
      image: ContainerImage.fromEcrRepository(repository, props.compute.imageTag),
      environment: this.environmentForDeployable(props, deployable),
      logging: LogDrivers.awsLogs({
        logGroup,
        streamPrefix: deployable.name,
      }),
    });

    if (deployable.port) {
      container.addPortMappings({
        containerPort: deployable.port,
        protocol: Protocol.TCP,
      });
    }

    this.grantRuntimePermissions(props, deployable, taskDefinition);

    new StringParameter(this, `${constructId}TaskDefinitionArnParameter`, {
      parameterName: `/${props.resourcePrefix}/ecs/task-definitions/${deployable.name}/arn`,
      stringValue: taskDefinition.taskDefinitionArn,
    });

    return taskDefinition;
  }

  private createFargateService(
    props: LabelLensComputeConstructProps,
    deployable: DeployableContainerConfig,
    taskDefinition: FargateTaskDefinition,
  ): FargateService {
    const constructId = toConstructId(deployable.name);
    const desiredCount = this.desiredCountForDeployable(props.compute, deployable);
    const serviceName = `${props.resourcePrefix}-${deployable.name}`;

    const service = new FargateService(this, `${constructId}Service`, {
      cluster: this.cluster,
      serviceName,
      taskDefinition,
      desiredCount,
      assignPublicIp: false,
      circuitBreaker: {
        enable: true,
        rollback: true,
      },
      enableECSManagedTags: true,
      ...(deployable.name === "gateway"
        ? {
            healthCheckGracePeriod: Duration.seconds(props.compute.gatewayHealthCheckGracePeriodSeconds),
          }
        : {}),
      maxHealthyPercent: props.compute.deploymentMaxHealthyPercent,
      minHealthyPercent: props.compute.deploymentMinHealthyPercent,
      propagateTags: PropagatedTagSource.SERVICE,
      securityGroups: this.securityGroupsForDeployable(deployable),
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      ...(deployable.kind === "service"
        ? {
            cloudMapOptions: {
              cloudMapNamespace: this.privateDnsNamespace,
              dnsRecordType: DnsRecordType.A,
              dnsTtl: Duration.seconds(props.compute.serviceDiscoveryTtlSeconds),
              name: deployable.name,
            },
          }
        : {}),
    });

    new StringParameter(this, `${constructId}ServiceNameParameter`, {
      parameterName: `/${props.resourcePrefix}/ecs/services/${deployable.name}/name`,
      stringValue: serviceName,
    });

    new StringParameter(this, `${constructId}ServiceArnParameter`, {
      parameterName: `/${props.resourcePrefix}/ecs/services/${deployable.name}/arn`,
      stringValue: service.serviceArn,
    });

    this.configureAutoscaling(props.compute, deployable, service);

    return service;
  }

  private desiredCountForDeployable(compute: ComputeConfig, deployable: DeployableContainerConfig): number {
    if (compute.deploymentMode === "bootstrap") {
      return 0;
    }

    return deployable.desiredCount ?? this.defaultDesiredCount(compute, deployable);
  }

  private defaultDesiredCount(compute: ComputeConfig, deployable: DeployableContainerConfig): number {
    return deployable.kind === "service" ? compute.defaultServiceDesiredCount : compute.defaultWorkerDesiredCount;
  }

  private configureAutoscaling(
    compute: ComputeConfig,
    deployable: DeployableContainerConfig,
    service: FargateService,
  ): void {
    if (compute.deploymentMode === "bootstrap" || !deployable.autoScaling) {
      return;
    }

    const scalableTaskCount = service.autoScaleTaskCount({
      maxCapacity: deployable.autoScaling.maxCapacity,
      minCapacity: deployable.autoScaling.minCapacity,
    });

    scalableTaskCount.scaleOnCpuUtilization(`${toConstructId(deployable.name)}CpuScaling`, {
      scaleInCooldown: Duration.seconds(deployable.autoScaling.scaleInCooldownSeconds),
      scaleOutCooldown: Duration.seconds(deployable.autoScaling.scaleOutCooldownSeconds),
      targetUtilizationPercent: deployable.autoScaling.cpuTargetUtilizationPercent,
    });
  }

  private securityGroupsForDeployable(deployable: DeployableContainerConfig): SecurityGroup[] {
    return deployable.name === "gateway" ? [this.gatewayIngressSecurityGroup] : [this.serviceSecurityGroup];
  }

  private environmentForDeployable(
    props: LabelLensComputeConstructProps,
    deployable: DeployableContainerConfig,
  ): Record<string, string> {
    const common: Record<string, string> = {
      AWS_REGION: Stack.of(this).region,
      LABEL_LENS_TABLE: props.table.tableName,
      NODE_ENV: "production",
      STORAGE_DRIVER: "dynamodb",
    };

    if (deployable.port) {
      common.PORT = String(deployable.port);
    }

    const serviceUrl = (name: string, port: number) => `http://${name}.${props.compute.privateDnsNamespaceName}:${port}`;

    switch (deployable.name) {
      case "gateway":
        return {
          ...common,
          GATEWAY_ALLOWED_ORIGINS: props.compute.gatewayAllowedOrigins.join(","),
          LABEL_LENS_AUTH_SERVICE_URL: serviceUrl("auth-service", 4105),
          LABEL_LENS_FAVORITES_SERVICE_URL: serviceUrl("favorites-service", 4104),
          LABEL_LENS_FOOD_SERVICE_URL: serviceUrl("food-service", 4101),
          LABEL_LENS_MENU_SERVICE_URL: serviceUrl("menu-service", 4103),
          LABEL_LENS_PRODUCT_SERVICE_URL: serviceUrl("product-service", 4102),
        };
      case "food-service":
        return {
          ...common,
          ANALYTICS_QUEUE_URL: props.queues.analytics.queueUrl,
        };
      case "product-service":
        return {
          ...common,
          ANALYTICS_QUEUE_URL: props.queues.analytics.queueUrl,
          OPEN_FOOD_FACTS_MODE: "fixture",
          PRODUCT_NOT_FOUND_QUEUE_URL: props.queues.productNotFound.queueUrl,
        };
      case "menu-service":
      case "favorites-service":
        return {
          ...common,
          ANALYTICS_QUEUE_URL: props.queues.analytics.queueUrl,
        };
      case "product-not-found-worker":
        return {
          ...common,
          PRODUCT_NOT_FOUND_QUEUE_URL: props.queues.productNotFound.queueUrl,
        };
      case "analytics-worker":
        return {
          ...common,
          ANALYTICS_QUEUE_URL: props.queues.analytics.queueUrl,
        };
      case "food-cache-refresh-worker":
        return {
          ...common,
          FOOD_CACHE_REFRESH_QUEUE_URL: props.queues.foodCacheRefresh.queueUrl,
          LABEL_LENS_FOOD_SERVICE_URL: serviceUrl("food-service", 4101),
        };
      case "product-cache-refresh-worker":
        return {
          ...common,
          LABEL_LENS_PRODUCT_SERVICE_URL: serviceUrl("product-service", 4102),
          PRODUCT_CACHE_REFRESH_QUEUE_URL: props.queues.productCacheRefresh.queueUrl,
        };
      case "dlq-handler":
        return {
          ...common,
          ANALYTICS_DLQ_URL: props.queues.analyticsDeadLetter.queueUrl,
          FOOD_CACHE_REFRESH_DLQ_URL: props.queues.foodCacheRefreshDeadLetter.queueUrl,
          PRODUCT_CACHE_REFRESH_DLQ_URL: props.queues.productCacheRefreshDeadLetter.queueUrl,
          PRODUCT_NOT_FOUND_DLQ_URL: props.queues.productNotFoundDeadLetter.queueUrl,
        };
      default:
        return common;
    }
  }

  private grantRuntimePermissions(
    props: LabelLensComputeConstructProps,
    deployable: DeployableContainerConfig,
    taskDefinition: FargateTaskDefinition,
  ): void {
    props.table.grantReadWriteData(taskDefinition.taskRole);

    switch (deployable.name) {
      case "food-service":
      case "menu-service":
      case "favorites-service":
        props.queues.analytics.grantSendMessages(taskDefinition.taskRole);
        break;
      case "product-service":
        props.queues.analytics.grantSendMessages(taskDefinition.taskRole);
        props.queues.productNotFound.grantSendMessages(taskDefinition.taskRole);
        break;
      case "product-not-found-worker":
        props.queues.productNotFound.grantConsumeMessages(taskDefinition.taskRole);
        break;
      case "analytics-worker":
        props.queues.analytics.grantConsumeMessages(taskDefinition.taskRole);
        break;
      case "food-cache-refresh-worker":
        props.queues.foodCacheRefresh.grantConsumeMessages(taskDefinition.taskRole);
        break;
      case "product-cache-refresh-worker":
        props.queues.productCacheRefresh.grantConsumeMessages(taskDefinition.taskRole);
        break;
      case "dlq-handler":
        props.queues.productNotFoundDeadLetter.grantConsumeMessages(taskDefinition.taskRole);
        props.queues.analyticsDeadLetter.grantConsumeMessages(taskDefinition.taskRole);
        props.queues.foodCacheRefreshDeadLetter.grantConsumeMessages(taskDefinition.taskRole);
        props.queues.productCacheRefreshDeadLetter.grantConsumeMessages(taskDefinition.taskRole);
        break;
      default:
        break;
    }
  }
}

function toConstructId(name: string): string {
  return name
    .split(/[/-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
