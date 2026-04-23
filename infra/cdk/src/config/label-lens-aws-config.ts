export type DeploymentMode = "bootstrap" | "release";

export type LabelLensAwsConfig = {
  environmentName: string;
  resourcePrefix: string;
  tableName: string;
  containerRepositoryNames: readonly string[];
  deployment: DeploymentConfig;
  compute: ComputeConfig;
  ingress: IngressConfig;
  auth: AuthConfig;
  apiGateway: ApiGatewayConfig;
  web: WebHostingConfig;
  queues: {
    productNotFound: QueueConfig;
    analytics: QueueConfig;
    foodCacheRefresh: QueueConfig;
    productCacheRefresh: QueueConfig;
  };
  schedules: {
    scheduleGroupName: string;
    foodCacheRefresh: ScheduleConfig;
    productCacheRefresh: ScheduleConfig;
  };
};

export type LabelLensAwsConfigOptions = {
  deploymentMode?: DeploymentMode;
  gatewayAllowedOrigins?: readonly string[];
  imageTag?: string;
  websiteAllowedOrigins?: readonly string[];
};

export type DeploymentConfig = {
  mode: DeploymentMode;
  imageTag: string;
};

export type IngressConfig = {
  loadBalancerSecurityGroupName: string;
  httpPort: number;
  gatewayTargetPort: number;
  gatewayHealthCheckPath: string;
  gatewayHealthCheckHealthyHttpCodes: string;
  healthCheckIntervalSeconds: number;
  healthCheckTimeoutSeconds: number;
  healthyThresholdCount: number;
  unhealthyThresholdCount: number;
  gatewayUnhealthyHostAlarmEvaluationPeriods: number;
  gatewayTarget5xxAlarmThreshold: number;
  gatewayTargetResponseTimeAlarmThresholdSeconds: number;
};

export type AuthConfig = {
  userPoolName: string;
  userPoolClientName: string;
};


export type WebHostingConfig = {
  bucketNamePrefix: string;
  distributionComment: string;
  runtimeConfigObjectKey: string;
  runtimeConfigCachePathPattern: string;
  cloudFrontFunctionName: string;
  priceClass: "PriceClass_100";
};

export type ApiGatewayConfig = {
  httpApiName: string;
  stageName: string;
  vpcLinkName: string;
  vpcLinkSecurityGroupName: string;
  corsAllowedOrigins: readonly string[];
  corsAllowedHeaders: readonly string[];
  corsAllowedMethods: readonly string[];
  accessLogGroupName: string;
  api5xxAlarmThreshold: number;
  apiLatencyAlarmThresholdMs: number;
};

export type ComputeConfig = {
  vpcName: string;
  clusterName: string;
  serviceSecurityGroupName: string;
  gatewayIngressSecurityGroupName: string;
  privateDnsNamespaceName: string;
  imageTag: string;
  deploymentMode: DeploymentMode;
  maxAzs: number;
  natGateways: number;
  gatewayAllowedOrigins: readonly string[];
  serviceDiscoveryTtlSeconds: number;
  defaultServiceDesiredCount: number;
  deploymentMinHealthyPercent: number;
  deploymentMaxHealthyPercent: number;
  gatewayHealthCheckGracePeriodSeconds: number;
  defaultTask: {
    cpu: number;
    memoryLimitMiB: number;
  };
  deployables: readonly DeployableContainerConfig[];
};

export type DeployableContainerConfig = {
  name: string;
  kind: "service";
  port?: number;
  cpu?: number;
  memoryLimitMiB?: number;
  desiredCount?: number;
  autoScaling?: {
    minCapacity: number;
    maxCapacity: number;
    cpuTargetUtilizationPercent: number;
    scaleInCooldownSeconds: number;
    scaleOutCooldownSeconds: number;
  };
};

export type QueueConfig = {
  queueName: string;
  deadLetterQueueName: string;
  maxReceiveCount: number;
};

export type ScheduleConfig = {
  scheduleName: string;
  scheduleExpression: string;
  limit: number;
};

export const serviceContainerRepositoryNames = [
  "gateway",
  "auth-service",
  "food-service",
  "product-service",
  "menu-service",
  "favorites-service",
] as const;

export function createLabelLensAwsConfig(
  environmentName: string,
  options: LabelLensAwsConfigOptions = {},
): LabelLensAwsConfig {
  const normalizedEnvironmentName = normalizeEnvironmentName(environmentName);
  const resourcePrefix = `labellens-${normalizedEnvironmentName}`;
  const deploymentMode = options.deploymentMode ?? "release";
  const imageTag = normalizeImageTag(options.imageTag ?? "latest");
  const gatewayAllowedOrigins = normalizeStringList(options.gatewayAllowedOrigins, ["http://localhost:3000"]);
  const websiteAllowedOrigins = normalizeStringList(options.websiteAllowedOrigins, gatewayAllowedOrigins);

  return {
    environmentName: normalizedEnvironmentName,
    resourcePrefix,
    tableName: `${resourcePrefix}-table`,
    containerRepositoryNames: serviceContainerRepositoryNames.map((name) => `${resourcePrefix}/${name}`),
    deployment: {
      mode: deploymentMode,
      imageTag,
    },
    compute: {
      vpcName: `${resourcePrefix}-vpc`,
      clusterName: `${resourcePrefix}-cluster`,
      serviceSecurityGroupName: `${resourcePrefix}-service-sg`,
      gatewayIngressSecurityGroupName: `${resourcePrefix}-gateway-ingress-sg`,
      privateDnsNamespaceName: `${resourcePrefix}.local`,
      imageTag,
      deploymentMode,
      maxAzs: 2,
      natGateways: 1,
      gatewayAllowedOrigins,
      serviceDiscoveryTtlSeconds: 30,
      defaultServiceDesiredCount: 1,
      deploymentMinHealthyPercent: 100,
      deploymentMaxHealthyPercent: 200,
      gatewayHealthCheckGracePeriodSeconds: 60,
      defaultTask: {
        cpu: 256,
        memoryLimitMiB: 512,
      },
      deployables: [
        {
          name: "gateway",
          kind: "service",
          port: 4000,
          cpu: 512,
          memoryLimitMiB: 1024,
          autoScaling: {
            minCapacity: 1,
            maxCapacity: 3,
            cpuTargetUtilizationPercent: 60,
            scaleInCooldownSeconds: 120,
            scaleOutCooldownSeconds: 60,
          },
        },
        { name: "auth-service", kind: "service", port: 4105 },
        { name: "food-service", kind: "service", port: 4101 },
        { name: "product-service", kind: "service", port: 4102 },
        { name: "menu-service", kind: "service", port: 4103 },
        { name: "favorites-service", kind: "service", port: 4104 },
      ],
    },
    ingress: {
      loadBalancerSecurityGroupName: `${resourcePrefix}-internal-alb-sg`,
      httpPort: 80,
      gatewayTargetPort: 4000,
      gatewayHealthCheckPath: "/gateway/health",
      gatewayHealthCheckHealthyHttpCodes: "200",
      healthCheckIntervalSeconds: 30,
      healthCheckTimeoutSeconds: 5,
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
      gatewayUnhealthyHostAlarmEvaluationPeriods: 2,
      gatewayTarget5xxAlarmThreshold: 5,
      gatewayTargetResponseTimeAlarmThresholdSeconds: 2,
    },
    auth: {
      userPoolName: `${resourcePrefix}-users`,
      userPoolClientName: `${resourcePrefix}-web-client`,
    },
    apiGateway: {
      httpApiName: `${resourcePrefix}-http-api`,
      stageName: "$default",
      vpcLinkName: `${resourcePrefix}-vpc-link`,
      vpcLinkSecurityGroupName: `${resourcePrefix}-apigw-vpc-link-sg`,
      corsAllowedOrigins: websiteAllowedOrigins,
      corsAllowedHeaders: ["authorization", "content-type", "x-correlation-id"],
      corsAllowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      accessLogGroupName: `/${resourcePrefix}/apigateway/http-api`,
      api5xxAlarmThreshold: 5,
      apiLatencyAlarmThresholdMs: 2000,
    },
    web: {
      bucketNamePrefix: `${resourcePrefix}-web`,
      distributionComment: `${resourcePrefix} static web distribution`,
      runtimeConfigObjectKey: "runtime-config.json",
      runtimeConfigCachePathPattern: "runtime-config.json",
      cloudFrontFunctionName: `${resourcePrefix}-web-rewrite`,
      priceClass: "PriceClass_100",
    },
    queues: {
      productNotFound: {
        queueName: `${resourcePrefix}-product-not-found-queue`,
        deadLetterQueueName: `${resourcePrefix}-product-not-found-dlq`,
        maxReceiveCount: 3,
      },
      analytics: {
        queueName: `${resourcePrefix}-analytics-queue`,
        deadLetterQueueName: `${resourcePrefix}-analytics-dlq`,
        maxReceiveCount: 3,
      },
      foodCacheRefresh: {
        queueName: `${resourcePrefix}-food-cache-refresh-queue`,
        deadLetterQueueName: `${resourcePrefix}-food-cache-refresh-dlq`,
        maxReceiveCount: 3,
      },
      productCacheRefresh: {
        queueName: `${resourcePrefix}-product-cache-refresh-queue`,
        deadLetterQueueName: `${resourcePrefix}-product-cache-refresh-dlq`,
        maxReceiveCount: 3,
      },
    },
    schedules: {
      scheduleGroupName: `${resourcePrefix}-schedules`,
      foodCacheRefresh: {
        scheduleName: `${resourcePrefix}-food-cache-refresh-daily`,
        scheduleExpression: "cron(0 3 * * ? *)",
        limit: 50,
      },
      productCacheRefresh: {
        scheduleName: `${resourcePrefix}-product-cache-refresh-daily`,
        scheduleExpression: "cron(15 3 * * ? *)",
        limit: 50,
      },
    },
  };
}

function normalizeEnvironmentName(environmentName: string): string {
  const normalized = environmentName.trim().toLowerCase();

  if (!normalized) {
    throw new Error("environmentName must not be empty.");
  }

  if (!/^[a-z0-9-]+$/.test(normalized)) {
    throw new Error("environmentName must contain only lowercase letters, numbers, and hyphens.");
  }

  return normalized;
}

export function normalizeDeploymentMode(value: string): DeploymentMode {
  const normalized = value.trim().toLowerCase();

  if (normalized === "bootstrap" || normalized === "release") {
    return normalized;
  }

  throw new Error("deploymentMode must be either 'bootstrap' or 'release'.");
}

export function normalizeImageTag(imageTag: string): string {
  const normalized = imageTag.trim();

  if (!normalized) {
    throw new Error("imageTag must not be empty.");
  }

  return normalized;
}

function normalizeStringList(values: readonly string[] | undefined, fallback: readonly string[]): string[] {
  const source = values && values.length > 0 ? values : fallback;
  const normalized = source.map((value) => value.trim()).filter((value) => value.length > 0);

  if (normalized.length === 0) {
    return [...fallback];
  }

  return Array.from(new Set(normalized));
}
