import { serve } from "@hono/node-server";
import { createGatewayApp } from "./app.js";
import { readGatewayConfig } from "./config/gateway-config.js";

const gatewayConfig = readGatewayConfig();
const app = createGatewayApp(gatewayConfig);

serve(
  {
    fetch: app.fetch,
    port: gatewayConfig.port,
  },
  (info) => {
    console.log(`LabelLens Gateway running at http://localhost:${info.port}`);
    console.log(`Forwarding /api/v1/* to ${gatewayConfig.apiInternalBaseUrl}`);
  },
);
