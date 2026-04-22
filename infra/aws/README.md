# LabelLens AWS deployment readiness

Phase 8G prepares the real AWS deployment path without forcing an AWS account during local development.

First deploy is two-step: deploy `bootstrap` mode with ECS desired count 0, push images, then deploy `release` mode.

```powershell
npm run aws:deploy:check
npm run aws:first-deploy -- -Environment dev -Region us-east-1 -ImageTag latest
npm run aws:smoke -- -Environment dev -Region us-east-1
```
