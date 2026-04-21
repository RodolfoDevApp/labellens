import { describe, expect, it } from "vitest";
import type { EventPublisher, LabelLensEvent, ProductCacheRepository } from "@labellens/application";
import type { ProductProvider } from "./product-provider.js";
import type { ProductLookupResponse, ProductSearchResponse } from "./product-service-responses.js";
import { LookupProductByBarcodeQuery } from "./lookup-product-by-barcode-query.js";

class EmptyProductCache implements ProductCacheRepository<ProductLookupResponse, ProductSearchResponse> {
  async getBarcode(): Promise<ProductLookupResponse | null> {
    return null;
  }

  async setBarcode(_barcode: string, value: ProductLookupResponse): Promise<ProductLookupResponse> {
    return value;
  }

  async getSearch(): Promise<ProductSearchResponse | null> {
    return null;
  }

  async setSearch(_query: string, value: ProductSearchResponse): Promise<ProductSearchResponse> {
    return value;
  }

  async listBarcodes(): Promise<string[]> {
    return [];
  }
}

function createEmptyProductProvider(): ProductProvider {
  return {
    async lookupProductByBarcode(): Promise<ProductLookupResponse | null> {
      return null;
    },

    async searchProducts(): Promise<ProductSearchResponse> {
      return {
        items: [],
        queryUsed: "",
        source: "OPEN_FOOD_FACTS",
        sourceMode: "fixture",
      };
    },
  };
}

function createRecordingEventPublisher(publishedEvents: LabelLensEvent[]): EventPublisher {
  return {
    async publish(event: LabelLensEvent): Promise<void> {
      publishedEvents.push(event);
    },
  };
}

describe("LookupProductByBarcodeQuery", () => {
  it("publishes product.not_found.v1 without blocking lookup response", async () => {
    const publishedEvents: LabelLensEvent[] = [];
    const query = new LookupProductByBarcodeQuery(
      "fixture",
      new EmptyProductCache(),
      createEmptyProductProvider(),
      createRecordingEventPublisher(publishedEvents),
    );

    const result = await query.execute({
      barcode: "1234567890123",
      correlationId: "corr-1",
    });

    expect(result).toBeNull();
    expect(publishedEvents).toHaveLength(1);

    const publishedEvent = publishedEvents[0];

    if (!publishedEvent) {
      throw new Error("Expected product.not_found.v1 event to be published.");
    }

    expect(publishedEvent).toMatchObject({
      eventType: "product.not_found.v1",
      eventVersion: 1,
      correlationId: "corr-1",
      producer: "product-service",
      payload: {
        barcode: "1234567890123",
        source: "OPEN_FOOD_FACTS",
        sourceMode: "fixture",
        reason: "OFF_NOT_FOUND",
        requestPath: "/api/v1/products/barcode/{barcode}",
      },
    });
  });
});
