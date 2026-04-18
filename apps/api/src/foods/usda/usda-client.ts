import { appConfig } from "../../config/app-config.js";

export type UsdaFoodNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
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

export type UsdaSearchResponse = {
  foods?: UsdaSearchFood[];
  totalHits?: number;
  currentPage?: number;
  totalPages?: number;
};

export type UsdaClient = {
  searchFoods(query: string, page?: number): Promise<UsdaSearchResponse>;
};

export function createUsdaClient(): UsdaClient {
  return {
    async searchFoods(query: string, page = 1): Promise<UsdaSearchResponse> {
      if (!appConfig.usdaApiKey) {
        throw new Error("USDA_API_KEY is not configured");
      }

      const url = new URL(`${appConfig.usdaApiBaseUrl}/foods/search`);
      url.searchParams.set("api_key", appConfig.usdaApiKey);
      url.searchParams.set("query", query);
      url.searchParams.set("pageNumber", String(page));
      url.searchParams.set("pageSize", "10");
      url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS)");

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "LabelLens/0.1 local-dev"
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`USDA search failed with status ${response.status}`);
      }

      return response.json() as Promise<UsdaSearchResponse>;
    }
  };
}
