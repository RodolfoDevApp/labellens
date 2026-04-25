# LabelLens

**LabelLens** is a full-stack nutrition planning MVP built as a portfolio project.

It helps users search food nutrition data, scan product barcodes, build daily menus by grams, save menus, and generate a weekly meal board that can be printed or saved as a PDF.

The project demonstrates end-to-end software engineering skills across frontend UX, backend services, authentication, cloud deployment, infrastructure as code, CI-ready build scripts, and operational tooling.

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [AWS Deployment](#aws-deployment)
- [Security Notes](#security-notes)
- [Project Status](#project-status)
- [What This Project Demonstrates](#what-this-project-demonstrates)

---

## Features

- Food search with calories and macronutrients
- Product barcode lookup
- Daily menu builder by grams
- Saved menus and favorite foods
- Weekly meal board
- Print / save as PDF flow for weekly planning
- Cognito-backed authentication
- Account registration and email confirmation
- Login and logout
- Password recovery flow
- Responsive mobile-first UI
- Runtime frontend configuration
- AWS deployment automation
- Smoke tests and preflight deployment checks

---

## Screenshots

> Add screenshots under `docs/screenshots/`.

### Landing Page

![Landing page](docs/screenshots/01-landing-desktop.png)

### Mobile Layout

![Mobile layout](docs/screenshots/02-landing-mobile.png)

### Authentication Flow

![Authentication flow](docs/screenshots/03-auth-register.png)

### Food Search

![Food search](docs/screenshots/04-food-search.png)

### Menu Builder

![Menu builder](docs/screenshots/05-menu-builder.png)

### Weekly Meal Board

![Week board](docs/screenshots/06-week-board.png)

### Print / Save as PDF

![Week board PDF](docs/screenshots/07-week-board-pdf.png)

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Static export for CloudFront and S3 hosting

### Backend

- Node.js
- TypeScript
- Hono
- Service-oriented backend architecture
- API Gateway entrypoint
- Authentication service
- Food service
- Product service
- Menu service
- Favorites service

### Cloud / Infrastructure

- AWS CDK
- Amazon CloudFront
- Amazon S3
- Amazon API Gateway
- Amazon ECS Fargate
- Amazon ECR
- Amazon Cognito
- Amazon DynamoDB
- AWS Systems Manager Parameter Store
- Amazon CloudWatch
- Amazon SQS
- Amazon EventBridge Scheduler

### Local Development

- Docker Compose
- LocalStack
- PowerShell automation scripts

---

## Architecture Overview

```text
User
  |
  v
CloudFront + S3
  |
  v
Next.js static frontend
  |
  v
API Gateway
  |
  v
Internal gateway service
  |
  +--> Auth service      --> Cognito
  +--> Food service      --> USDA / cache layer
  +--> Product service   --> Product lookup / cache layer
  +--> Menu service      --> DynamoDB
  +--> Favorites service --> DynamoDB
```

The frontend is deployed as a static site behind CloudFront. Runtime API configuration is loaded from a generated `runtime-config.json` file, so the frontend does not require hardcoded cloud URLs.

Backend services run as private ECS/Fargate services behind an internal load balancer and are exposed through API Gateway.

---

## Project Structure

```text
apps/
  web/                 # Next.js frontend
  gateway/             # API gateway service
  auth-service/        # Cognito auth/session service
  food-service/        # Food nutrition search service
  product-service/     # Product barcode lookup service
  menu-service/        # Saved menus and week board service
  favorites-service/   # Favorite foods service

packages/
  contracts/           # API contracts and OpenAPI generation
  domain/              # Shared domain model
  application/         # Application layer
  infrastructure/      # Shared infrastructure helpers
  service-support/     # Shared service utilities

infra/
  aws/                 # Deployment scripts
  cdk/                 # AWS CDK app and stacks
  compose/             # Local Docker Compose setup
  local/               # LocalStack scripts
```

---

## Getting Started

### Install Dependencies

```bash
npm install
```

### Build the Frontend

```bash
npm run build:web
```

### Build Shared Packages

```bash
npm run build:core
```

### Build Backend Services

```bash
npm run build:services
```

### Run Tests

```bash
npm run test:auth-service
npm run test:cdk
```

---

## AWS Deployment

The project includes PowerShell scripts for AWS deployment and validation.

### Preflight Checks

```bash
npm run aws:preflight -- -Environment dev -Region us-east-1 -DeploymentMode release -ImageTag latest
```

### Deploy

```bash
npm run aws:deploy -- -Environment dev -Region us-east-1 -DeploymentMode release -ImageTag latest
```

### Check Deployment Status

```bash
npm run aws:status -- -Environment dev -Region us-east-1
```

### Run Smoke Tests

```bash
npm run aws:smoke -- -Environment dev -Region us-east-1
```

---

## Security Notes

This repository does not include production secrets.

Secrets such as API keys are expected to be stored in **AWS Systems Manager Parameter Store** as `SecureString` values.

The following files and artifacts are intentionally excluded from version control:

- Generated CDK context
- Local diagnostics
- `.env` files
- Archives
- Private keys
- Other sensitive local artifacts

---

## Project Status

This project is an MVP built for portfolio and interview demonstration purposes.

It is not intended to provide medical advice. Nutrition data may be incomplete or sourced from external APIs. Users should consult qualified professionals for medical or dietary decisions.

---

## What This Project Demonstrates

- Full-stack TypeScript development
- Production-style AWS architecture
- Infrastructure as code with AWS CDK
- Authentication with Amazon Cognito
- Runtime configuration for static frontend deployments
- Microservice boundaries
- API contracts and OpenAPI artifacts
- Cloud deployment automation
- Debugging real deployment issues
- Mobile responsive UI polish
- Operational scripts for preflight checks, smoke testing, and failure diagnostics
