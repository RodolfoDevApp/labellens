import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { readProductServiceConfig } from "./config/product-service-config.js";

const config = readProductServiceConfig();

serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`LabelLens product-service listening on http://localhost:${config.port}`);
