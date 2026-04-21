import type { SqsPollingConsumer } from "@labellens/infrastructure";

export type AnalyticsWorkerDependencies = {
  consumer: SqsPollingConsumer;
};
