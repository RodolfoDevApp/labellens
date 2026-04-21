import type { FoodServiceConfig } from "../../config/food-service-config.js";

export type UsdaFoodNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: {
    id?: number;
    name?: string;
    unitName?: string;
  };
};

export type UsdaSearchFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaFoodNutrient[];
};

export type UsdaFoodDetail = UsdaSearchFood;

export type UsdaSearchResponse = {
  foods?: UsdaSearchFood[];
  totalHits?: number;
  currentPage?: number;
  totalPages?: number;
};

export type UsdaClient = {
  searchFoods(query: string, page?: number): Promise<UsdaSearchResponse>;
  getFoodById(fdcId: string): Promise<UsdaFoodDetail>;
};

async function parseUsdaResponse<T>(response: Response, action: string): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `USDA ${action} failed with status ${response.status}: ${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}

export function createUsdaClient(config: FoodServiceConfig): UsdaClient {
  return {
    async searchFoods(query: string, page = 1): Promise<UsdaSearchResponse> {
      if (!config.usdaApiKey) {
        throw new Error("USDA_API_KEY is not configured");
      }

      const url = new URL(`${config.usdaApiBaseUrl}/foods/search`);
      url.searchParams.set("api_key", config.usdaApiKey);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "LabelLens/0.1 local-dev",
        },
        body: JSON.stringify({
          query,
          pageNumber: page,
          pageSize: 25,
          dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
        }),
        signal: AbortSignal.timeout(8000),
      });

      return parseUsdaResponse<UsdaSearchResponse>(response, "search");
    },

    async getFoodById(fdcId: string): Promise<UsdaFoodDetail> {
      if (!config.usdaApiKey) {
        throw new Error("USDA_API_KEY is not configured");
      }

      const url = new URL(`${config.usdaApiBaseUrl}/food/${fdcId}`);
      url.searchParams.set("api_key", config.usdaApiKey);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "LabelLens/0.1 local-dev",
        },
        signal: AbortSignal.timeout(8000),
      });

      return parseUsdaResponse<UsdaFoodDetail>(response, "detail");
    },
  };
}
