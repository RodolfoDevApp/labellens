import type { AnalyticsEventRecord } from "../analytics/types/analytics-event-record.js";

export interface AnalyticsEventRepository {
  save(record: AnalyticsEventRecord): Promise<void>;
}
