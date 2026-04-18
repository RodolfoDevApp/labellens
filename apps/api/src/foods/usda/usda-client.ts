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

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "LabelLens/0.1 local-dev"
        },
        body: JSON.stringify({
          query,
          pageNumber: page,
          pageSize: 25,
          dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"]
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
          `USDA search failed with status ${response.status}: ${errorBody}`,
        );
      }

      return response.json() as Promise<UsdaSearchResponse>;
    }
  };
}
