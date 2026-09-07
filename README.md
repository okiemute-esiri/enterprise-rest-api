# Enterprise REST API

A production-oriented TypeScript backend demonstrating layered REST API design, validation, deterministic error handling, replaceable persistence, PostgreSQL integration testing, structured HTTP logging, request correlation, containerization and CI.

## Current Status

The repository contains a working customer API with in-memory and Prisma/PostgreSQL persistence behind the same repository contract. PostgreSQL behavior is verified in CI against a real PostgreSQL 16 service, while the in-memory adapter remains useful for deterministic API tests and zero-dependency local runs.

## Implemented

- Node.js 22 + TypeScript + Express
- strict TypeScript configuration
- versioned `/api/v1` customer API
- customer domain model and repository contract
- application service layer
- in-memory repository adapter
- Prisma/PostgreSQL repository adapter
- Prisma schema and committed SQL migration
- runtime persistence selection through `DATABASE_URL`
- normalized duplicate-email handling
- Prisma uniqueness violations translated to repository conflicts
- stable application-level `409` conflict semantics
- Zod request validation
- centralized structured error responses
- request correlation through generated/preserved `x-request-id`
- structured JSON HTTP completion logging
- structured unexpected-error logging
- health and readiness endpoints
- graceful HTTP and Prisma shutdown
- Vitest + Supertest end-to-end API tests
- PostgreSQL-backed Prisma integration tests
- OpenAPI 3 specification
- architecture documentation
- multi-stage Docker image with generated Prisma client
- Docker Compose PostgreSQL development stack
- GitHub Actions CI with PostgreSQL 16, migrations, tests, build and Docker verification

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 22+ |
| Language | TypeScript |
| HTTP | Express |
| Validation | Zod |
| Persistence | In-memory + PostgreSQL/Prisma |
| Testing | Vitest + Supertest |
| API Contract | OpenAPI 3 |
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## Architecture

```text
Client
  |
  v
Express HTTP API
  |
  +-- validation
  +-- correlation ID
  +-- structured logging
  +-- response/error mapping
  |
  v
CustomerService
  |
  v
CustomerRepository
  |
  +-- InMemoryCustomerRepository
  `-- PrismaCustomerRepository
          |
          v
      PostgreSQL
```

The application layer depends on the repository abstraction rather than a database implementation. Tests can use deterministic in-memory persistence while production-style runs use PostgreSQL without changing business logic.

## API Endpoints

```text
GET    /health
GET    /ready

GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:customerId
PATCH  /api/v1/customers/:customerId
DELETE /api/v1/customers/:customerId
```

All responses include an `x-request-id` header. A caller-provided value is preserved; otherwise the service generates a UUID. Completed requests emit JSON log records containing request ID, method, path, status code and duration.

## PostgreSQL

Set `DATABASE_URL` to enable Prisma/PostgreSQL persistence:

```env
DATABASE_URL=postgresql://app:app@localhost:5432/enterprise_rest_api?schema=public
```

For the local PostgreSQL stack:

```bash
docker compose up -d postgres
npm install
npm run prisma:generate
npm run prisma:deploy
npm run dev
```

Without `DATABASE_URL`, the server uses the in-memory repository.

## Validation

```bash
npm run prisma:generate
npm run typecheck
npm test
npm run build
docker build -t enterprise-rest-api .
```

The test suite includes both API-level tests and real PostgreSQL integration tests. CI starts PostgreSQL 16, deploys committed migrations, executes the test suite, builds the TypeScript output and verifies the Docker image.

## Error Contract

| Condition | Status | Code |
| --- | ---: | --- |
| Validation failure | 422 | `VALIDATION_ERROR` |
| Duplicate email | 409 | `CONFLICT` |
| Customer not found | 404 | `NOT_FOUND` |
| Route not found | 404 | `ROUTE_NOT_FOUND` |
| Unexpected failure | 500 | `INTERNAL_ERROR` |

## Engineering Roadmap

- [x] Define architecture and API conventions
- [x] Bootstrap TypeScript backend
- [x] Implement customer resource
- [x] Add request validation
- [x] Add centralized error handling
- [x] Add end-to-end tests
- [x] Add OpenAPI specification
- [x] Add Docker image
- [x] Add GitHub Actions CI
- [x] Add health/readiness endpoints
- [x] Add graceful shutdown
- [x] Add PostgreSQL/Prisma persistence
- [x] Add initial migration
- [x] Add PostgreSQL integration tests
- [x] Add stable persistence conflict translation
- [x] Add request correlation IDs
- [x] Add structured JSON logging
- [x] Add Docker Compose PostgreSQL environment
- [ ] Add cursor pagination and advanced filtering
- [ ] Add metrics and distributed tracing
- [ ] Add deployment manifests

## Engineering Focus

This project demonstrates backend engineering beyond basic CRUD: dependency inversion, explicit service boundaries, deterministic failure semantics, migration-aware persistence, real database integration testing, operational correlation and logging, containerized local development and CI-backed verification.
