import { createDlqHandlerDependencies } from "./composition/create-dlq-handler-dependencies.js";
import { runDlqHandler } from "./runtime/run-dlq-handler.js";

await runDlqHandler(createDlqHandlerDependencies());
