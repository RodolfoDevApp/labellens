import { RecordProductNotFoundCommand, type ProductNotFoundEvent } from "@labellens/application";

export class HandleProductNotFoundMessageCommand {
  constructor(private readonly recordProductNotFound: RecordProductNotFoundCommand) {}

  async execute(event: ProductNotFoundEvent): Promise<void> {
    await this.recordProductNotFound.execute(event);
  }
}
