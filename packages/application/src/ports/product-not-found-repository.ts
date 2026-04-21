import type { ProductNotFoundRecord } from "../ops/types/product-not-found-record.js";

export interface ProductNotFoundRepository {
  save(record: ProductNotFoundRecord): Promise<void>;
}
