export type DeploymentMode = "bootstrap" | "release";

export type LabelLensAwsConfig = {
  environmentName: string;
  resourcePrefix: string;
  tableName: string;
  containerRepositoryNames: readonly string[];
  deployment: DeploymentConfig;
  compute: ComputeConfig;
  ingress: IngressConfig;
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
  ingressAllowedCidrBlocks?: readonly string[];
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
  allowedCidrBlocks: readonly string[];
  gatewayUnhealthyHostAlarmEvaluationPeriods: number;
  gatewayTarget5xxAlarmThreshold: number;
  gatewayTargetResponseTimeAlarmThresholdSeconds: number;
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
  const ingressAllowedCidrBlocks = normalizeStringList(options.ingressAllowedCidrBlocks, ["0.0.0.0/0"]);

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
      loadBalancerSecurityGroupName: `${resourcePrefix}-public-alb-sg`,
      httpPort: 80,
      gatewayTargetPort: 4000,
      gatewayHealthCheckPath: "/gateway/health",
      gatewayHealthCheckHealthyHttpCodes: "200",
      healthCheckIntervalSeconds: 30,
      healthCheckTimeoutSeconds: 5,
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
      allowedCidrBlocks: ingressAllowedCidrBlocks,
      gatewayUnhealthyHostAlarmEvaluationPeriods: 2,
      gatewayTarget5xxAlarmThreshold: 5,
      gatewayTargetResponseTimeAlarmThresholdSeconds: 2,
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

export function normalizeEnvironmentName(environmentName: string): string {
  const normalized = environmentName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  if (!normalized) {
    return "dev";
  }

  return normalized.replace(/^-+|-+$/g, "").slice(0, 24) || "dev";
}

export function normalizeDeploymentMode(mode: string): DeploymentMode {
  const normalized = mode.trim().toLowerCase();

  if (normalized === "bootstrap" || normalized === "release") {
    return normalized;
  }

  throw new Error("Deployment mode must be either 'bootstrap' or 'release'.");
}

export function normalizeImageTag(tag: string): string {
  const normalized = tag.trim();

  if (!normalized) {
    return "latest";
  }

  if (!/^[a-zA-Z0-9_.-]{1,128}$/.test(normalized)) {
    throw new Error("Container image tag must be 1-128 characters and contain only letters, numbers, underscore, dot or dash.");
  }

  return normalized;
}

function normalizeStringList(value: readonly string[] | undefined, fallback: readonly string[]): readonly string[] {
  const candidates = value?.map((entry) => entry.trim()).filter(Boolean) ?? [];

  return candidates.length > 0 ? candidates : fallback;
}
