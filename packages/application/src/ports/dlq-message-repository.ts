import type { DlqMessageRecord } from "../dlq/types/dlq-message-record.js";

export interface DlqMessageRepository {
  save(record: DlqMessageRecord): Promise<void>;
}
