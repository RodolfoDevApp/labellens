export type FoodCacheRefreshRequest = {
  correlationId: string;
  limit: number;
  scheduledFor: string;
};

export interface FoodCacheRefreshClient {
  refresh(request: FoodCacheRefreshRequest): Promise<void>;
}

export class HttpFoodCacheRefreshClient implements FoodCacheRefreshClient {
  constructor(private readonly foodServiceUrl: string) {}

  async refresh(request: FoodCacheRefreshRequest): Promise<void> {
    const response = await fetch(`${this.foodServiceUrl}/internal/cache/refresh/food`, {
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
      throw new Error(`Food cache refresh request failed with status ${response.status}: ${body}`);
    }
  }
}
