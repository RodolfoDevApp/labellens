export type ProductCacheRefreshRequest = {
  correlationId: string;
  limit: number;
  scheduledFor: string;
};

export interface ProductCacheRefreshClient {
  refresh(request: ProductCacheRefreshRequest): Promise<void>;
}

export class HttpProductCacheRefreshClient implements ProductCacheRefreshClient {
  constructor(private readonly productServiceUrl: string) {}

  async refresh(request: ProductCacheRefreshRequest): Promise<void> {
    const response = await fetch(`${this.productServiceUrl}/internal/cache/refresh/product`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-correlation-id": request.correlationId,
      },
      body: JSON.stringify({
        limit: request.limit,
        scheduledFor: request.scheduledFor,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Product cache refresh request failed with status ${response.status}: ${body}`);
    }
  }
}
