# Enterprise REST API

A production-oriented TypeScript backend project demonstrating layered REST API design, validation, domain boundaries, automated tests, containerization, CI/CD, operational endpoints and API documentation.

## Current Status

The repository now contains a working first implementation of the customer domain. It is intentionally built with an in-memory repository behind a domain interface so the API can run and be tested without external infrastructure while PostgreSQL/Prisma remains the next persistence milestone.

### Implemented

- TypeScript + Express service bootstrap
- Strict TypeScript configuration
- Versioned `/api/v1` customer endpoints
- Customer domain model and repository contract
- In-memory repository implementation
- Application service layer
- Zod request validation
- Centralized structured error responses
- Duplicate-email conflict handling
- Health and readiness endpoints
- End-to-end API tests with Vitest + Supertest
- OpenAPI 3 specification
- Multi-stage Docker image
- GitHub Actions CI pipeline
- Graceful HTTP server shutdown
- Architecture documentation

### Planned

- PostgreSQL persistence
- Prisma schema and migrations
- Cursor pagination and advanced filtering
- Structured JSON logging and correlation IDs
- Metrics and tracing
- Docker Compose development stack with PostgreSQL
- Database integration tests

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 22+ |
| Language | TypeScript |
| HTTP | Express |
| Validation | Zod |
| Testing | Vitest + Supertest |
| API Contract | OpenAPI 3 |
| Containers | Docker |
| CI/CD | GitHub Actions |
| Planned Persistence | PostgreSQL + Prisma |

## Architecture

```text
Client
  |
  v
Express HTTP API
  |
  +-- request validation
  +-- routing
  +-- response/error mapping
  |
  v
CustomerService
  |
  v
CustomerRepository interface
  |
  +-- InMemoryCustomerRepository   [implemented]
  +-- PrismaCustomerRepository     [planned]
```

The application layer depends on the repository abstraction rather than a database implementation. This keeps domain behaviour testable and makes persistence replaceable.

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

### Create Customer

```http
POST /api/v1/customers
Content-Type: application/json
```

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com"
}
```

Successful response:

```json
{
  "data": {
    "id": "generated-uuid",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "createdAt": "2026-09-06T11:00:00.000Z",
    "updatedAt": "2026-09-06T11:00:00.000Z"
  }
}
```

## Error Contract

Known failures return stable error codes rather than framework exceptions.

| Condition | Status | Code |
| --- | ---: | --- |
| Validation failure | 422 | `VALIDATION_ERROR` |
| Duplicate email | 409 | `CONFLICT` |
| Customer not found | 404 | `NOT_FOUND` |
| Route not found | 404 | `ROUTE_NOT_FOUND` |
| Unexpected failure | 500 | `INTERNAL_ERROR` |

Example:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "A customer with this email already exists"
  }
}
```

## Repository Structure

```text
enterprise-rest-api/
├── src/
│   ├── application/
│   │   └── customer-service.ts
│   ├── domain/
│   │   ├── customer.ts
│   │   └── customer-repository.ts
│   ├── infrastructure/
│   │   └── in-memory-customer-repository.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   └── e2e/
│       └── customers.test.ts
├── docs/
│   ├── architecture.md
│   └── openapi.yaml
├── .github/workflows/
│   └── ci.yml
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

## Running Locally

Requirements:

- Node.js 22+
- npm

```bash
npm install
npm run dev
```

The default server address is:

```text
http://localhost:3000
```

## Validation Commands

```bash
npm run typecheck
npm test
npm run build
```

The end-to-end test suite currently validates:

- customer creation;
- resource retrieval;
- updates;
- deletion;
- validation failures;
- duplicate-email conflicts.

## Docker

Build the image:

```bash
docker build -t enterprise-rest-api .
```

Run it:

```bash
docker run --rm -p 3000:3000 enterprise-rest-api
```

## CI/CD

GitHub Actions runs on pushes to `main` and pull requests. The pipeline performs:

```text
Checkout
   |
Setup Node.js
   |
Install Dependencies
   |
Type Check
   |
Tests
   |
Build
```

The workflow has been exercised on GitHub Actions; the TypeScript patch-model issue found during CI was corrected and a subsequent CI run completed successfully.

## OpenAPI

The API contract is documented in:

```text
docs/openapi.yaml
```

This file documents the customer endpoints, request schemas and principal response states.

## Engineering Roadmap

- [x] Define architecture and API conventions
- [x] Bootstrap TypeScript backend
- [x] Implement customer domain resource
- [x] Add request validation
- [x] Add centralized error handling
- [x] Add end-to-end tests
- [x] Add OpenAPI specification
- [x] Add Docker image
- [x] Add GitHub Actions CI
- [x] Add health/readiness endpoints
- [x] Add graceful shutdown
- [ ] Add PostgreSQL + Prisma
- [ ] Add migrations and seed data
- [ ] Add cursor pagination
- [ ] Add integration tests against PostgreSQL
- [ ] Add structured logging and correlation IDs
- [ ] Add metrics/tracing
- [ ] Add deployment manifests

## Engineering Focus

This project is intended to demonstrate backend software engineering rather than only CRUD functionality: dependency inversion, explicit service boundaries, API contracts, deterministic failure semantics, automated testing, container packaging and continuous integration.
