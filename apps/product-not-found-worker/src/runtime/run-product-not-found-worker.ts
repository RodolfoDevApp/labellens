import { readProductNotFoundWorkerConfig } from "../config/product-not-found-worker-config.js";
import type { ProductNotFoundWorkerDependencies } from "../composition/product-not-found-worker-dependencies.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runProductNotFoundWorker(dependencies: ProductNotFoundWorkerDependencies): Promise<void> {
  const config = readProductNotFoundWorkerConfig();

  console.log(JSON.stringify({ level: "info", message: "product-not-found-worker.started" }));

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
          message: "product-not-found-worker.poll.failed",
          error: error instanceof Error ? error.message : "Unknown worker error.",
        }),
      );

      await delay(config.idleDelayMs);
    }
  }
}
