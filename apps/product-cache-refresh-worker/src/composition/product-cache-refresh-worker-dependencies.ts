import type { SqsPollingConsumer } from "@labellens/infrastructure";

export type ProductCacheRefreshWorkerDependencies = {
  consumer: SqsPollingConsumer;
};
