# @labellens/contracts

Contracts package for LabelLens HTTP API.

This package owns request/response schemas and the generated OpenAPI 3.1 document for the current `/api/v1` API. API routes import validation schemas from here so the implementation and documentation do not drift.

## Commands

```bash
npm run build -w @labellens/contracts
npm run generate:openapi -w @labellens/contracts
```

Generated files:

```txt
packages/contracts/generated/openapi.json
packages/contracts/generated/openapi.yaml
```
