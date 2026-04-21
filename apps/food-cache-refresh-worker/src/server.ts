import { createFoodCacheRefreshWorkerDependencies } from "./composition/create-food-cache-refresh-worker-dependencies.js";
import { runFoodCacheRefreshWorker } from "./runtime/run-food-cache-refresh-worker.js";

await runFoodCacheRefreshWorker(createFoodCacheRefreshWorkerDependencies());
