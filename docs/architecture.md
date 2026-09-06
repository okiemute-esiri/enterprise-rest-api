# Architecture

## Overview

The service follows a layered design intended to keep HTTP concerns, application use cases, domain contracts and infrastructure implementations independently understandable and replaceable.

## Layers

### API layer

The API layer owns HTTP routing, request parsing, validation, status codes and response serialization. It should not contain persistence logic.

### Application layer

The application layer coordinates business use cases. `CustomerService` currently owns uniqueness checks and resource-not-found handling while depending only on the `CustomerRepository` contract.

### Domain layer

The domain layer defines customer data structures and repository interfaces. It has no dependency on Express or persistence technology.

### Infrastructure layer

The initial implementation uses an in-memory repository so the service can run and be tested without external infrastructure. PostgreSQL/Prisma is the next persistence milestone; the application service will remain unchanged when the repository implementation is replaced.

## Dependency Direction

```text
HTTP -> Application -> Domain
          ^             ^
          |             |
      Infrastructure ---+
```

Dependencies point toward domain abstractions rather than from domain code toward frameworks.

## Current Request Flow

```text
POST /api/v1/customers
        |
        v
Zod validation
        |
        v
CustomerService.create
        |
        +-- check existing email
        |
        v
CustomerRepository.create
        |
        v
HTTP 201 response
```

## Error Semantics

Known application failures are translated into stable API responses:

- validation -> `422 VALIDATION_ERROR`
- duplicate email -> `409 CONFLICT`
- missing customer -> `404 NOT_FOUND`
- unknown route -> `404 ROUTE_NOT_FOUND`
- unexpected exception -> `500 INTERNAL_ERROR`

Internal stack traces are not returned to clients.

## Persistence Evolution

The `CustomerRepository` interface is the persistence boundary. Planned PostgreSQL work will add a Prisma-backed repository implementing the same contract, allowing the current in-memory implementation to remain useful for isolated tests.

## Production Readiness Roadmap

1. PostgreSQL + Prisma migrations.
2. Cursor pagination and filtering.
3. Structured logging and correlation IDs.
4. Request timeouts and operational metrics.
5. Docker Compose development stack.
6. Integration tests against a disposable PostgreSQL database.
7. Authentication/authorization as a separate concern where business requirements require it.
