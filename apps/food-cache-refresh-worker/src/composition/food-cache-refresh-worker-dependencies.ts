import type { SqsPollingConsumer } from "@labellens/infrastructure";

export type FoodCacheRefreshWorkerDependencies = {
  consumer: SqsPollingConsumer;
};
