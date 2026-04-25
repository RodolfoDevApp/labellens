import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { readFoodServiceConfig } from "./config/food-service-config.js";

const config = readFoodServiceConfig();

serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`LabelLens food-service listening on port ${config.port}`);
