import { readDlqHandlerConfig } from "../config/dlq-handler-config.js";
import type { DlqHandlerDependencies } from "../composition/dlq-handler-dependencies.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runDlqHandler(dependencies: DlqHandlerDependencies): Promise<void> {
  const config = readDlqHandlerConfig();

  console.log(JSON.stringify({ level: "info", message: "dlq-handler.started" }));

  while (true) {
    try {
      const processedCounts = await Promise.all(dependencies.consumers.map((consumer) => consumer.pollOnce()));
      const processed = processedCounts.reduce((total, count) => total + count, 0);

      if (processed === 0) {
        await delay(config.idleDelayMs);
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "dlq-handler.poll.failed",
          error: error instanceof Error ? error.message : "Unknown worker error.",
        }),
      );

      await delay(config.idleDelayMs);
    }
  }
}
