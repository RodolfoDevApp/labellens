import { HOP_BY_HOP_HEADERS } from "./hop-by-hop-headers.js";

export function createDownstreamResponse(upstreamResponse: Response, correlationId: string): Response {
  const headers = new Headers();

  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set("x-correlation-id", correlationId);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}
