import type { EventPublisher, ProductCacheRepository } from "@labellens/application";
import { createProductNotFoundEvent } from "@labellens/application";
import type { ProductProvider } from "./product-provider.js";
import type {
  ProductLookupResponse,
  ProductSearchResponse,
  ProductSourceMode,
} from "./product-service-responses.js";

export type LookupProductByBarcodeInput = {
  barcode: string;
  correlationId: string;
};

export class LookupProductByBarcodeQuery {
  constructor(
    private readonly sourceMode: ProductSourceMode,
    private readonly cache: ProductCacheRepository<ProductLookupResponse, ProductSearchResponse>,
    private readonly provider: ProductProvider,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: LookupProductByBarcodeInput): Promise<ProductLookupResponse | null> {
    const cached = await this.cache.getBarcode(input.barcode);

    if (cached) {
      return cached;
    }

    const result = await this.provider.lookupProductByBarcode(input.barcode);

    if (!result) {
      this.publishProductNotFound(input);

      return null;
    }

    const normalizedResult = {
      ...result,
      sourceMode: this.sourceMode,
    } satisfies ProductLookupResponse;

    return this.cache.setBarcode(input.barcode, normalizedResult);
  }

  private publishProductNotFound(input: LookupProductByBarcodeInput): void {
    const event = createProductNotFoundEvent({
      barcode: input.barcode,
      correlationId: input.correlationId,
    });

    void this.eventPublisher.publish(event).catch((error: unknown) => {
      console.error(
        JSON.stringify({
          level: "error",
          message: "product.not_found.publish.failed",
          eventId: event.eventId,
          correlationId: event.correlationId,
          error: error instanceof Error ? error.message : "Unknown event publish error.",
        }),
      );
    });
  }
}
