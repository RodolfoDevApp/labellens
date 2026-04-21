import { HOP_BY_HOP_HEADERS } from "./hop-by-hop-headers.js";

export function createUpstreamHeaders(requestHeaders: Headers, correlationId: string): Headers {
  const headers = new Headers();

  requestHeaders.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set("x-correlation-id", correlationId);

  return headers;
}
