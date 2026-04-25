import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { readAuthServiceConfig } from "./config/auth-service-config.js";

const config = readAuthServiceConfig();

serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`LabelLens auth-service listening on port ${config.port}`);
