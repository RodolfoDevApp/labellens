import { createProductNotFoundWorkerDependencies } from "./composition/create-product-not-found-worker-dependencies.js";
import { runProductNotFoundWorker } from "./runtime/run-product-not-found-worker.js";

await runProductNotFoundWorker(createProductNotFoundWorkerDependencies());
