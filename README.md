# Enterprise REST API

A production-oriented TypeScript backend project demonstrating layered REST API design, validation, domain boundaries, automated tests, containerization, CI/CD, operational endpoints, API documentation and replaceable persistence.

## Current Status

The repository contains a working customer API with two persistence adapters behind the same domain repository contract. The in-memory adapter remains the zero-dependency default for tests and quick local runs, while PostgreSQL persistence is available through Prisma whenever `DATABASE_URL` is configured.

### Implemented

- TypeScript + Express service bootstrap
- Strict TypeScript configuration
- Versioned `/api/v1` customer endpoints
- Customer domain model and repository contract
- In-memory repository implementation
- Prisma PostgreSQL repository implementation
- Prisma schema and initial SQL migration
- Runtime persistence selection through `DATABASE_URL`
- Application service layer
- Zod request validation
- Centralized structured error responses
- Duplicate-email conflict handling
- Health and readiness endpoints
- End-to-end API tests with Vitest + Supertest
- OpenAPI 3 specification
- Multi-stage Docker image with generated Prisma client
- GitHub Actions CI pipeline with Prisma generation and Docker verification
- Graceful HTTP server and Prisma shutdown
- Architecture documentation

### Planned

- Database-backed integration tests
- Cursor pagination and advanced filtering
- Structured JSON logging and correlation IDs
- Metrics and tracing
- Docker Compose development stack with PostgreSQL
- Deployment manifests

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
| Containers | Docker |
| CI/CD | GitHub Actions |

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
  +-- InMemoryCustomerRepository
  `-- PrismaCustomerRepository
          |
          v
      PostgreSQL
```

The application layer depends on the repository abstraction rather than a database implementation. Tests can therefore use deterministic in-memory persistence while production-style runs use PostgreSQL without changing service logic.

## Persistence Selection

Without `DATABASE_URL`, the server uses the in-memory repository.

With `DATABASE_URL`, it uses Prisma/PostgreSQL:

```env
DATABASE_URL=postgresql://app:app@localhost:5432/enterprise_rest_api?schema=public
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Apply migrations during development:

```bash
npm run prisma:migrate
```

Apply committed migrations in a deployment environment:

```bash
npm run prisma:deploy
```

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

## Repository Structure

```text
enterprise-rest-api/
├── prisma/
│   ├── migrations/
│   │   └── 20260906132000_init/
│   │       └── migration.sql
│   └── schema.prisma
├── src/
│   ├── application/
│   │   └── customer-service.ts
│   ├── domain/
│   │   ├── customer.ts
│   │   └── customer-repository.ts
│   ├── infrastructure/
│   │   ├── in-memory-customer-repository.ts
│   │   ├── prisma-customer-repository.ts
│   │   └── prisma.ts
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

For an in-memory run:

```bash
npm install
npm run dev
```

For PostgreSQL persistence, set `DATABASE_URL`, generate the client, apply the migration, then start the service.

## Validation Commands

```bash
npm run prisma:generate
npm run typecheck
npm test
npm run build
```

The end-to-end tests intentionally use the in-memory repository so CI remains deterministic without requiring a database service. Database-backed integration tests are a separate planned milestone.

## Docker

Build the image:

```bash
docker build -t enterprise-rest-api .
```

The image includes the generated Prisma client. At runtime, provide `DATABASE_URL` to enable PostgreSQL persistence or omit it to use in-memory persistence.

## CI/CD

GitHub Actions now validates the full build path:

```text
Checkout
   |
Setup Node.js
   |
Install Dependencies
   |
Generate Prisma Client
   |
Type Check
   |
Tests
   |
Build
   |
Docker Image Build
```

## OpenAPI

The API contract is documented in `docs/openapi.yaml`.

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
- [x] Add PostgreSQL/Prisma schema and repository adapter
- [x] Add initial migration
- [ ] Add PostgreSQL integration tests
- [ ] Add cursor pagination
- [ ] Add structured logging and correlation IDs
- [ ] Add metrics/tracing
- [ ] Add Docker Compose PostgreSQL environment
- [ ] Add deployment manifests

## Engineering Focus

This project is intended to demonstrate backend software engineering rather than only CRUD functionality: dependency inversion, explicit service boundaries, API contracts, deterministic failure semantics, replaceable persistence, migration-aware database design, automated testing, container packaging and continuous integration.
