import type { Context } from "hono";
import { buildUpstreamUrl } from "./build-upstream-url.js";
import { createDownstreamResponse } from "./create-downstream-response.js";
import { createUpstreamHeaders } from "./create-upstream-headers.js";
import { shouldForwardBody } from "./should-forward-body.js";

export type ProxyApiRequestOptions = {
  apiInternalBaseUrl: string;
  fetchImpl?: typeof fetch;
};

export async function proxyApiRequest(c: Context, options: ProxyApiRequestOptions): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const correlationId = c.get("correlationId") as string;
  const requestUrl = new URL(c.req.url);
  const upstreamUrl = buildUpstreamUrl(options.apiInternalBaseUrl, requestUrl.pathname, requestUrl.searchParams.toString());

  try {
    const upstreamResponse = await fetchImpl(upstreamUrl, {
      method: c.req.method,
      headers: createUpstreamHeaders(c.req.raw.headers, correlationId),
      body: shouldForwardBody(c.req.method) ? c.req.raw.body : undefined,
      duplex: shouldForwardBody(c.req.method) ? "half" : undefined,
    } as RequestInit & { duplex?: "half" });

    return createDownstreamResponse(upstreamResponse, correlationId);
  } catch {
    return c.json(
      {
        type: "about:blank",
        title: "Gateway upstream unavailable",
        status: 503,
        detail: "The internal API service is not reachable from the gateway.",
        code: "gateway.upstream_unavailable",
        correlationId,
      },
      503,
    );
  }
}
