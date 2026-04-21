export type LabelLensAwsConfig = {
  environmentName: string;
  resourcePrefix: string;
  tableName: string;
  containerRepositoryNames: readonly string[];
  queues: {
    productNotFound: QueueConfig;
    analytics: QueueConfig;
    foodCacheRefresh: QueueConfig;
    productCacheRefresh: QueueConfig;
  };
};

export type QueueConfig = {
  queueName: string;
  deadLetterQueueName: string;
  maxReceiveCount: number;
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
] as const;

export function createLabelLensAwsConfig(environmentName: string): LabelLensAwsConfig {
  const normalizedEnvironmentName = normalizeEnvironmentName(environmentName);
  const resourcePrefix = `labellens-${normalizedEnvironmentName}`;

  return {
    environmentName: normalizedEnvironmentName,
    resourcePrefix,
    tableName: `${resourcePrefix}-table`,
    containerRepositoryNames: serviceContainerRepositoryNames.map((name) => `${resourcePrefix}/${name}`),
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
  };
}

export function normalizeEnvironmentName(environmentName: string): string {
  const normalized = environmentName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  if (!normalized) {
    return "dev";
  }

  return normalized.replace(/^-+|-+$/g, "").slice(0, 24) || "dev";
}
