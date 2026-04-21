import type { SqsPollingConsumer } from "@labellens/infrastructure";

export type ProductNotFoundWorkerDependencies = {
  consumer: SqsPollingConsumer;
};
