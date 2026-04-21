import { readProductCacheRefreshWorkerConfig } from "../config/product-cache-refresh-worker-config.js";
import type { ProductCacheRefreshWorkerDependencies } from "../composition/product-cache-refresh-worker-dependencies.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runProductCacheRefreshWorker(dependencies: ProductCacheRefreshWorkerDependencies): Promise<void> {
  const config = readProductCacheRefreshWorkerConfig();

  console.log(JSON.stringify({ level: "info", message: "product-cache-refresh-worker.started" }));

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
          message: "product-cache-refresh-worker.poll.failed",
          error: error instanceof Error ? error.message : "Unknown worker error.",
        }),
      );

      await delay(config.idleDelayMs);
    }
  }
}
