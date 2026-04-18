import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { appConfig } from "./config/app-config.js";

serve(
  {
    fetch: app.fetch,
    port: appConfig.port,
  },
  (info) => {
    console.log(`LabelLens API running at http://localhost:${info.port}`);
  },
);
