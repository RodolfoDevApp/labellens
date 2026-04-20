# Application package

This package contains LabelLens application ports and, in later phases, use cases.

Current scope for phase 1:

- AuthSessionVerifier
- SavedMenuRepository
- FavoriteRepository
- FoodCacheRepository
- ProductCacheRepository
- EventPublisher

Rules:

- This package can depend on `@labellens/domain`.
- It must not depend on Hono, AWS SDK, DynamoDB, SQS, fetch, LocalStack, Next.js, or browser APIs.
- Concrete adapters live outside this package.
