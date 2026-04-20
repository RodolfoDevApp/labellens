export type CacheDynamoDbItem<TValue> = {
  PK: string;
  SK: string;
  entityType: "Cache";
  value: TValue;
  expiresAt: number;
  updatedAt: string;
};
