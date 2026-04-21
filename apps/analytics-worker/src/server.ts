import { createAnalyticsWorkerDependencies } from "./composition/create-analytics-worker-dependencies.js";
import { runAnalyticsWorker } from "./runtime/run-analytics-worker.js";

await runAnalyticsWorker(createAnalyticsWorkerDependencies());
