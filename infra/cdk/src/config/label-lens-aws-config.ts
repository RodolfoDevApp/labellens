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

export type AuthMode = "demo" | "cognito";
export type ProductSourceMode = "fixture" | "live";

export type LabelLensAwsConfigOptions = {
  authMode?: AuthMode;
  deploymentMode?: DeploymentMode;
  gatewayAllowedOrigins?: readonly string[];
  imageTag?: string;
  openFoodFactsMode?: ProductSourceMode;
  usdaApiKey?: string;
  usdaApiKeyParameterName?: string;
  usdaApiKeyParameterVersion?: number;
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
  mode: AuthMode;
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
  authMode: AuthMode;
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
  authMode: AuthMode;
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
  openFoodFactsMode: ProductSourceMode;
  usdaApiKey?: string;
  usdaApiKeyParameterName?: string;
  usdaApiKeyParameterVersion?: number;
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
  const authMode = options.authMode ?? "cognito";
  const deploymentMode = options.deploymentMode ?? "release";
  const imageTag = normalizeImageTag(options.imageTag ?? "latest");
  const gatewayAllowedOrigins = normalizeStringList(options.gatewayAllowedOrigins, ["*"]);
  const openFoodFactsMode = options.openFoodFactsMode ?? "live";
  const usdaApiKey = normalizeOptionalString(options.usdaApiKey);
  const usdaApiKeyParameterName = normalizeOptionalString(
    options.usdaApiKeyParameterName ?? `/labellens/${normalizedEnvironmentName}/usda/api-key`,
  );
  const usdaApiKeyParameterVersion = normalizeOptionalPositiveInteger(
    options.usdaApiKeyParameterVersion ?? 1,
    "usdaApiKeyParameterVersion",
  );
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
      authMode,
      serviceSecurityGroupName: `${resourcePrefix}-service-sg`,
      gatewayIngressSecurityGroupName: `${resourcePrefix}-gateway-ingress-sg`,
      privateDnsNamespaceName: `${resourcePrefix}.local`,
      imageTag,
      deploymentMode,
      maxAzs: 2,
      natGateways: 1,
      gatewayAllowedOrigins,
      openFoodFactsMode,
      serviceDiscoveryTtlSeconds: 30,
      defaultServiceDesiredCount: 1,
      deploymentMinHealthyPercent: 100,
      deploymentMaxHealthyPercent: 200,
      gatewayHealthCheckGracePeriodSeconds: 60,
      defaultTask: {
        cpu: 256,
        memoryLimitMiB: 512,
      },
      ...(usdaApiKey ? { usdaApiKey } : {}),
      ...(usdaApiKeyParameterName ? { usdaApiKeyParameterName } : {}),
      ...(usdaApiKeyParameterName ? { usdaApiKeyParameterVersion } : {}),
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
      mode: authMode,
      userPoolName: `${resourcePrefix}-users`,
      userPoolClientName: `${resourcePrefix}-web-client`,
    },
    apiGateway: {
      authMode,
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
        scheduleExpression: "cron(0 4 * * ? *)",
        limit: 100,
      },
      productCacheRefresh: {
        scheduleName: `${resourcePrefix}-product-cache-refresh-daily`,
        scheduleExpression: "cron(30 4 * * ? *)",
        limit: 100,
      },
    },
  };
}

export function normalizeEnvironmentName(environmentName: string): string {
  const normalized = environmentName.trim().toLowerCase();

  if (!/^[a-z][a-z0-9-]{1,15}$/.test(normalized)) {
    throw new Error(
      `Invalid environment name '${environmentName}'. Use 2-16 lowercase letters, digits or hyphen, starting with a letter.`,
    );
  }

  return normalized;
}

export function normalizeDeploymentMode(value: string): DeploymentMode {
  if (value === "bootstrap" || value === "release") {
    return value;
  }

  throw new Error(`Unsupported deployment mode '${value}'. Use 'bootstrap' or 'release'.`);
}

export function normalizeImageTag(value: string): string {
  const normalized = value.trim();

  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(normalized)) {
    throw new Error(`Invalid image tag '${value}'.`);
  }

  return normalized;
}

function normalizeStringList(value: readonly string[] | undefined, fallback: readonly string[]): readonly string[] {
  const source = value ?? fallback;
  const normalized = source
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (normalized.length === 0) {
    throw new Error("Expected at least one string entry.");
  }

  return [...new Set(normalized)];
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalPositiveInteger(value: number | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid ${label} '${value}'. Use a positive integer.`);
  }

  return value;
}
