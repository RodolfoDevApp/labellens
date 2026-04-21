import type { DlqMessageRepository } from "../../ports/dlq-message-repository.js";
import type { DlqMessageRecord } from "../types/dlq-message-record.js";

export class RecordDlqMessageCommand {
  constructor(private readonly repository: DlqMessageRepository) {}

  async execute(record: DlqMessageRecord): Promise<void> {
    await this.repository.save(record);
  }
}
