import { readFoodCacheRefreshWorkerConfig } from "../config/food-cache-refresh-worker-config.js";
import type { FoodCacheRefreshWorkerDependencies } from "../composition/food-cache-refresh-worker-dependencies.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runFoodCacheRefreshWorker(dependencies: FoodCacheRefreshWorkerDependencies): Promise<void> {
  const config = readFoodCacheRefreshWorkerConfig();

  console.log(JSON.stringify({ level: "info", message: "food-cache-refresh-worker.started" }));

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
          message: "food-cache-refresh-worker.poll.failed",
          error: error instanceof Error ? error.message : "Unknown worker error.",
        }),
      );

      await delay(config.idleDelayMs);
    }
  }
}
