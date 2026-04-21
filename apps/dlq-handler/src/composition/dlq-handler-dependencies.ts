import type { SqsPollingConsumer } from "@labellens/infrastructure";

export type DlqHandlerDependencies = {
  consumers: SqsPollingConsumer[];
};
