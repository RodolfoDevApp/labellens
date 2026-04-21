import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { readMenuServiceConfig } from "./config/menu-service-config.js";

const config = readMenuServiceConfig();

serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`LabelLens menu-service listening on http://localhost:${config.port}`);
