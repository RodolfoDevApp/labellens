import { describe, expect, it } from "vitest";
import { RecordProductNotFoundCommand, type ProductNotFoundEvent, type ProductNotFoundRecord, type ProductNotFoundRepository } from "@labellens/application";
import { HandleProductNotFoundMessageCommand } from "./handle-product-not-found-message-command.js";

class RecordingProductNotFoundRepository implements ProductNotFoundRepository {
  readonly records: ProductNotFoundRecord[] = [];

  async save(record: ProductNotFoundRecord): Promise<void> {
    this.records.push(record);
  }
}

function createProductNotFoundEvent(): ProductNotFoundEvent {
  return {
    eventId: "evt-1",
    eventType: "product.not_found.v1",
    occurredAt: "2026-04-21T00:00:00.000Z",
    correlationId: "corr-1",
    payload: {
      barcode: "99999999999999",
      source: "OPEN_FOOD_FACTS",
    },
  };
}

describe("HandleProductNotFoundMessageCommand", () => {
  it("records product.not_found.v1 events", async () => {
    const repository = new RecordingProductNotFoundRepository();
    const command = new HandleProductNotFoundMessageCommand(new RecordProductNotFoundCommand(repository));

    await command.execute(createProductNotFoundEvent());

    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      eventId: "evt-1",
      barcode: "99999999999999",
      source: "OPEN_FOOD_FACTS",
      correlationId: "corr-1",
      occurredAt: "2026-04-21T00:00:00.000Z",
    });
  });
});
