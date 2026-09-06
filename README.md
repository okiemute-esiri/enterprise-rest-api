# Enterprise REST API

A production-oriented backend engineering project focused on the design of maintainable, scalable, well-documented RESTful services. The repository is intended to demonstrate API architecture beyond basic CRUD: resource modelling, validation, pagination, filtering, versioning, persistence boundaries, observability, testing and deployment concerns.

> **Portfolio status:** Architecture and implementation roadmap. Features described as planned are not represented as production-complete until corresponding source code and tests are committed.

## Engineering Objectives

- Design predictable resource-oriented HTTP APIs.
- Separate transport, application, domain and persistence concerns.
- Apply consistent validation and error semantics.
- Support pagination, filtering, sorting and API evolution.
- Provide automated unit, integration and end-to-end tests.
- Package the service for reproducible containerized deployment.
- Establish CI checks for formatting, linting, tests and builds.

## Proposed Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js |
| Language | TypeScript |
| API | Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Testing | Vitest / Supertest |
| API Specification | OpenAPI 3 |
| Containers | Docker / Docker Compose |
| CI/CD | GitHub Actions |

## Target Architecture

```text
Client
  |
  v
HTTP / REST Layer
  |
  +-- Routes
  +-- Request Validation
  +-- Controllers
  |
  v
Application Layer
  |
  +-- Use Cases
  +-- Services
  +-- DTO Mapping
  |
  v
Domain Layer
  |
  +-- Entities
  +-- Business Rules
  +-- Repository Contracts
  |
  v
Infrastructure Layer
  |
  +-- PostgreSQL
  +-- Prisma Repositories
  +-- Logging
  +-- External Adapters
```

The architecture keeps HTTP-specific concerns outside the domain and makes persistence replaceable behind repository interfaces.

## Planned API Capabilities

### Resource Modelling

Resources will use consistent nouns, HTTP methods and status codes. Nested resources will be used only where the relationship is meaningful rather than reproducing database structure in URLs.

Example endpoints:

```text
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:customerId
PATCH  /api/v1/customers/:customerId
DELETE /api/v1/customers/:customerId

GET    /api/v1/orders
POST   /api/v1/orders
GET    /api/v1/orders/:orderId
```

### Pagination

The project will demonstrate both conventional page-based pagination and cursor/keyset approaches suitable for larger datasets.

Example:

```text
GET /api/v1/orders?limit=25&cursor=01J...
```

Response metadata:

```json
{
  "data": [],
  "pagination": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

### Filtering and Sorting

```text
GET /api/v1/orders?status=pending&sort=-createdAt&limit=25
```

Filtering will be explicitly allow-listed so arbitrary query parameters cannot accidentally become database operations.

### Validation

Validation will occur at the HTTP boundary before data reaches application services. Invalid input will produce deterministic machine-readable errors.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

## Error Model

Planned error categories include:

| Condition | HTTP Status |
| --- | ---: |
| Invalid request | 400 |
| Unauthenticated | 401 |
| Forbidden operation | 403 |
| Resource not found | 404 |
| State conflict | 409 |
| Validation failure | 422 |
| Rate exceeded | 429 |
| Unexpected server failure | 500 |

Internal exceptions will not be exposed directly to clients.

## API Versioning

Initial endpoints will use explicit URI versioning:

```text
/api/v1/...
```

The design will isolate transport DTOs from domain objects so future versions can evolve without forcing unnecessary changes into core business logic.

## Proposed Project Structure

```text
enterprise-rest-api/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── validators/
│   ├── application/
│   │   ├── dto/
│   │   ├── services/
│   │   └── use-cases/
│   ├── domain/
│   │   ├── entities/
│   │   ├── errors/
│   │   └── repositories/
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── logging/
│   │   └── repositories/
│   ├── config/
│   └── server.ts
├── prisma/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture.md
│   └── openapi.yaml
├── .github/workflows/
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Database Design

PostgreSQL is planned as the primary persistence layer. Database concerns will include:

- explicit primary and foreign keys;
- unique and check constraints;
- indexes based on query patterns;
- transactional writes for multi-step state changes;
- migrations committed to source control;
- development/test seed data separated from production configuration.

## Reliability Considerations

The implementation roadmap includes:

- request correlation IDs;
- structured application logs;
- graceful process shutdown;
- database connection lifecycle management;
- bounded request timeouts;
- idempotency for appropriate write operations;
- health and readiness endpoints.

Proposed operational endpoints:

```text
GET /health
GET /ready
```

## Testing Strategy

### Unit Tests

Domain rules and application use cases should be tested without requiring HTTP or a real database.

### Integration Tests

Repository implementations and database behaviour should be validated against a disposable PostgreSQL test environment.

### End-to-End Tests

Critical workflows should execute through the HTTP interface and verify status codes, response contracts and persistence side effects.

## CI/CD Roadmap

GitHub Actions will eventually execute:

```text
Checkout
   |
Install Dependencies
   |
Formatting / Lint
   |
Type Check
   |
Unit Tests
   |
Integration Tests
   |
Build
   |
Container Build
```

Deployment jobs will be introduced separately from pull-request validation.

## Containerization

The planned local environment will use Docker Compose to provide the API and PostgreSQL with reproducible configuration. The production image will use a multi-stage Docker build to separate dependency/build tooling from the runtime image.

## Observability

Planned operational telemetry includes:

- structured JSON logs;
- request duration;
- response status distribution;
- error counts;
- database latency;
- application health;
- correlation identifiers across request processing.

## Engineering Roadmap

- [x] Define repository purpose and architecture.
- [x] Document API conventions and error model.
- [ ] Bootstrap TypeScript backend.
- [ ] Add PostgreSQL and Prisma schema.
- [ ] Implement first domain resources.
- [ ] Add validation and centralized error handling.
- [ ] Generate OpenAPI specification.
- [ ] Add unit and integration tests.
- [ ] Add Docker development environment.
- [ ] Add GitHub Actions CI pipeline.
- [ ] Add observability and operational endpoints.
- [ ] Publish deployment documentation.

## What This Project Demonstrates

This repository is designed to demonstrate practical backend engineering skills including API contract design, layered architecture, relational persistence, validation, error handling, automated testing, containerization, CI/CD and production-readiness considerations.

## License

This project is maintained as part of a software engineering portfolio. Licensing information will be finalized as the implementation matures.
