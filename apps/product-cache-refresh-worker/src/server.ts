import { createProductCacheRefreshWorkerDependencies } from "./composition/create-product-cache-refresh-worker-dependencies.js";
import { runProductCacheRefreshWorker } from "./runtime/run-product-cache-refresh-worker.js";

await runProductCacheRefreshWorker(createProductCacheRefreshWorkerDependencies());
