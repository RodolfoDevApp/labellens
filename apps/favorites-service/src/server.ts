import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { readFavoritesServiceConfig } from "./config/favorites-service-config.js";

const config = readFavoritesServiceConfig();

serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`LabelLens favorites-service listening on http://localhost:${config.port}`);
