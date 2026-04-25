import { serve } from "@hono/node-server";
import { createGatewayApp } from "./app.js";
import { readGatewayConfig } from "./config/gateway-config.js";

const config = readGatewayConfig();
const app = createGatewayApp({
  allowedOrigins: config.allowedOrigins,
  serviceUrls: config.serviceUrls,
  storageDriver: config.storageDriver,
});

serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`LabelLens gateway listening on port ${config.port}`);
