export type LabelLensAwsConfig = {
  environmentName: string;
  resourcePrefix: string;
  tableName: string;
  containerRepositoryNames: readonly string[];
  compute: ComputeConfig;
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

export type ComputeConfig = {
  vpcName: string;
  clusterName: string;
  serviceSecurityGroupName: string;
  privateDnsNamespaceName: string;
  imageTag: string;
  maxAzs: number;
  natGateways: number;
  gatewayAllowedOrigins: readonly string[];
  serviceDiscoveryTtlSeconds: number;
  defaultServiceDesiredCount: number;
  defaultWorkerDesiredCount: number;
  defaultTask: {
    cpu: number;
    memoryLimitMiB: number;
  };
  deployables: readonly DeployableContainerConfig[];
};

export type DeployableContainerConfig = {
  name: string;
  kind: "service" | "worker";
  port?: number;
  cpu?: number;
  memoryLimitMiB?: number;
  desiredCount?: number;
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
  "product-not-found-worker",
  "analytics-worker",
  "food-cache-refresh-worker",
  "product-cache-refresh-worker",
  "dlq-handler",
] as const;

export function createLabelLensAwsConfig(environmentName: string): LabelLensAwsConfig {
  const normalizedEnvironmentName = normalizeEnvironmentName(environmentName);
  const resourcePrefix = `labellens-${normalizedEnvironmentName}`;

  return {
    environmentName: normalizedEnvironmentName,
    resourcePrefix,
    tableName: `${resourcePrefix}-table`,
    containerRepositoryNames: serviceContainerRepositoryNames.map((name) => `${resourcePrefix}/${name}`),
    compute: {
      vpcName: `${resourcePrefix}-vpc`,
      clusterName: `${resourcePrefix}-cluster`,
      serviceSecurityGroupName: `${resourcePrefix}-service-sg`,
      privateDnsNamespaceName: `${resourcePrefix}.local`,
      imageTag: "latest",
      maxAzs: 2,
      natGateways: 1,
      gatewayAllowedOrigins: ["http://localhost:3000"],
      serviceDiscoveryTtlSeconds: 30,
      defaultServiceDesiredCount: 1,
      defaultWorkerDesiredCount: 1,
      defaultTask: {
        cpu: 256,
        memoryLimitMiB: 512,
      },
      deployables: [
        { name: "gateway", kind: "service", port: 4000, cpu: 512, memoryLimitMiB: 1024 },
        { name: "auth-service", kind: "service", port: 4105 },
        { name: "food-service", kind: "service", port: 4101 },
        { name: "product-service", kind: "service", port: 4102 },
        { name: "menu-service", kind: "service", port: 4103 },
        { name: "favorites-service", kind: "service", port: 4104 },
        { name: "product-not-found-worker", kind: "worker" },
        { name: "analytics-worker", kind: "worker" },
        { name: "food-cache-refresh-worker", kind: "worker" },
        { name: "product-cache-refresh-worker", kind: "worker" },
        { name: "dlq-handler", kind: "worker" },
      ],
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
