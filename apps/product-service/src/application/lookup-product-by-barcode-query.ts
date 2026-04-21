import type { EventPublisher, ProductCacheRepository } from "@labellens/application";
import { createProductNotFoundEvent, createProductScannedEvent } from "@labellens/application";
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
      this.publishProductScanned(input, cached.sourceMode);
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

    const saved = await this.cache.setBarcode(input.barcode, normalizedResult);

    this.publishProductScanned(input, saved.sourceMode);

    return saved;
  }

  private publishProductScanned(input: LookupProductByBarcodeInput, sourceMode: ProductSourceMode): void {
    void this.eventPublisher.publish(
      createProductScannedEvent({
        barcode: input.barcode,
        sourceMode,
        correlationId: input.correlationId,
      }),
    );
  }

  private publishProductNotFound(input: LookupProductByBarcodeInput): void {
    void this.eventPublisher.publish(
      createProductNotFoundEvent({
        barcode: input.barcode,
        correlationId: input.correlationId,
      }),
    );
  }
}
