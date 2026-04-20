# Infrastructure package

Concrete infrastructure adapters live here. Application and domain code must not import AWS SDKs directly.

Current adapters:

- `DynamoDbSavedMenuRepository`
- `DynamoDbFavoriteRepository`
- `createDynamoDbDocumentClient`

Rules:

- Repositories implement `@labellens/application` ports.
- DynamoDB keys and mappers stay in separate files.
- No HTTP handlers, Hono code, or frontend DTOs belong in this package.
- AWS endpoint selection is configuration, not business logic.
