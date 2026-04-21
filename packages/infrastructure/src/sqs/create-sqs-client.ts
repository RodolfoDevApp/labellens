import { SQSClient, type SQSClientConfig } from "@aws-sdk/client-sqs";
import type { SqsConnectionConfig } from "./sqs-connection-config.js";

export function createSqsClient(config: SqsConnectionConfig): SQSClient {
  const clientConfig: SQSClientConfig = {
    region: config.region,
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }

  return new SQSClient(clientConfig);
}
