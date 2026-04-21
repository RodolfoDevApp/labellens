import {
  RecordProductNotFoundCommand,
  type EventIdempotencyRepository,
  type ProductNotFoundEvent,
} from "@labellens/application";

export class HandleProductNotFoundMessageCommand {
  constructor(
    private readonly recordProductNotFound: RecordProductNotFoundCommand,
    private readonly idempotencyRepository: EventIdempotencyRepository,
  ) {}

  async execute(event: ProductNotFoundEvent): Promise<void> {
    const shouldProcess = await this.idempotencyRepository.tryMarkProcessed(event);

    if (!shouldProcess) {
      return;
    }

    await this.recordProductNotFound.execute(event);
  }
}
