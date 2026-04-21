import { readAnalyticsWorkerConfig } from "../config/analytics-worker-config.js";
import type { AnalyticsWorkerDependencies } from "../composition/analytics-worker-dependencies.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runAnalyticsWorker(dependencies: AnalyticsWorkerDependencies): Promise<void> {
  const config = readAnalyticsWorkerConfig();

  console.log(JSON.stringify({ level: "info", message: "analytics-worker.started" }));

  while (true) {
    try {
      const processed = await dependencies.consumer.pollOnce();

      if (processed === 0) {
        await delay(config.idleDelayMs);
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "analytics-worker.poll.failed",
          error: error instanceof Error ? error.message : "Unknown worker error.",
        }),
      );

      await delay(config.idleDelayMs);
    }
  }
}
