# Enterprise REST API

A production-oriented TypeScript backend demonstrating layered REST API design, validation, deterministic error handling, replaceable persistence, PostgreSQL integration testing, cursor pagination, filtering, structured HTTP logging, request correlation, Prometheus-compatible metrics, OpenTelemetry tracing, containerization, Kubernetes deployment configuration and CI.

## Current Status

The repository contains a working customer API with in-memory and Prisma/PostgreSQL persistence behind the same repository contract. PostgreSQL behavior is verified in CI against a real PostgreSQL 16 service, while the in-memory adapter remains useful for deterministic API tests and zero-dependency local runs. Kubernetes deployment manifests are schema-validated in CI with kubeconform. Optional OpenTelemetry OTLP/HTTP trace export is available when an OTLP endpoint is configured.

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
- cursor-based customer pagination with configurable page size
- case-insensitive customer filtering across name and email
- Zod request and query validation
- centralized structured error responses
- request correlation through generated/preserved `x-request-id`
- structured JSON HTTP completion logging
- structured unexpected-error logging
- Prometheus-compatible `/metrics` endpoint
- request-count, cumulative-duration and process-uptime metrics
- W3C `traceparent` parsing and propagation
- OpenTelemetry server spans for HTTP requests
- optional OTLP/HTTP trace export to an OpenTelemetry-compatible backend or collector
- trace/span identifiers included in structured request logs
- dependency-aware readiness with a real PostgreSQL connectivity check
- graceful HTTP, Prisma and OpenTelemetry shutdown
- Vitest + Supertest end-to-end API tests
- PostgreSQL-backed Prisma integration tests
- OpenAPI 3 specification
- architecture documentation
- multi-stage Docker image with generated Prisma client and non-root runtime
- Docker Compose PostgreSQL development stack
- Kubernetes Deployment and ClusterIP Service manifests
- Kubernetes liveness/readiness probes and resource requests/limits
- HorizontalPodAutoscaler and PodDisruptionBudget
- restrictive Kubernetes container security context
- Kubernetes Secret example for `DATABASE_URL`
- GitHub Actions CI with PostgreSQL 16, migrations, tests, build and Docker verification
- strict offline Kubernetes schema validation with kubeconform

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 22+ |
| Language | TypeScript |
| HTTP | Express |
| Validation | Zod |
| Persistence | In-memory + PostgreSQL/Prisma |
| Observability | Structured JSON logs + Prometheus text metrics + OpenTelemetry OTLP tracing |
| Testing | Vitest + Supertest |
| API Contract | OpenAPI 3 |
| Containers | Docker + Docker Compose |
| Orchestration | Kubernetes manifests |
| CI/CD | GitHub Actions + kubeconform validation |

## Architecture

```text
Client
  |
  v
Express HTTP API
  |
  +-- validation
  +-- cursor pagination/filtering
  +-- request correlation
  +-- OpenTelemetry server span
  +-- W3C trace context
  +-- structured logging
  +-- HTTP metrics
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

OpenTelemetry span
  |
  `-- optional OTLP/HTTP exporter --> Collector / tracing backend
```

The application layer depends on the repository abstraction rather than a database implementation. Tests can use deterministic in-memory persistence while production-style runs use PostgreSQL without changing business logic.

## API Endpoints

```text
GET    /health
GET    /ready
GET    /metrics

GET    /api/v1/customers?limit=20&cursor=<uuid>&q=<search>
POST   /api/v1/customers
GET    /api/v1/customers/:customerId
PATCH  /api/v1/customers/:customerId
DELETE /api/v1/customers/:customerId
```

Customer listing responses include `meta.limit` and `meta.nextCursor`. The `q` parameter performs a case-insensitive substring search across customer name and email. Page size is constrained to 1–100 records.

All responses include an `x-request-id` header. A caller-provided value is preserved; otherwise the service generates a UUID. Requests also accept an optional W3C `traceparent` header. When OpenTelemetry export is enabled, the request middleware creates a server span and returns its trace/span context. When no SDK/exporter is configured, the existing dependency-light trace-context fallback remains active so correlation behavior is still available in local and test runs.

`GET /metrics` exposes Prometheus text-format metrics for HTTP request totals, cumulative request duration and process uptime. Prometheus/Grafana deployment remains an infrastructure concern.

## OpenTelemetry Tracing

Trace export is opt-in. The application starts the OpenTelemetry Node SDK only when an OTLP endpoint is supplied. This prevents local and CI runs from attempting to send telemetry to a nonexistent collector.

Use either a trace-specific endpoint:

```env
OTEL_SERVICE_NAME=enterprise-rest-api
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
```

or a base OTLP/HTTP endpoint:

```env
OTEL_SERVICE_NAME=enterprise-rest-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

With the base endpoint, the application appends `/v1/traces`. Set `OTEL_SDK_DISABLED=true` to explicitly disable SDK initialization. The application flushes and shuts down the telemetry SDK as part of graceful process termination.

This repository implements OTLP export capability but does not claim a hosted collector, Jaeger, Tempo, Honeycomb, Datadog or other live tracing backend unless one is configured externally.

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

`GET /ready` performs a real PostgreSQL connectivity check when database persistence is enabled. If PostgreSQL is unavailable, readiness returns HTTP `503` rather than reporting the pod as ready.

## Kubernetes Deployment

The `k8s/` directory contains deployment-oriented manifests for the API:

```text
k8s/
├── deployment.yaml
└── secret.example.yaml
```

`deployment.yaml` defines a two-replica rolling Deployment, ClusterIP Service, CPU-based HorizontalPodAutoscaler and PodDisruptionBudget. The container uses `/ready` and `/health` for readiness and liveness probes, declares CPU/memory requests and limits, and applies a restrictive security context with non-root execution, no privilege escalation, a read-only root filesystem and dropped Linux capabilities.

`secret.example.yaml` documents the expected `DATABASE_URL` Secret shape. It contains an example value only; real credentials must be supplied through the target environment's secret-management process and must not be committed.

The manifests are deployment configuration rather than evidence of a live hosted environment. CI validates their Kubernetes schemas offline with kubeconform in strict mode.

## Validation

```bash
npm run prisma:generate
npm run typecheck
npm test
npm run build
docker build -t enterprise-rest-api .
```

The test suite includes API-level pagination/filtering, dependency-aware readiness, metrics and trace-context coverage plus real PostgreSQL integration tests. CI starts PostgreSQL 16, deploys committed migrations, executes the test suite, builds the TypeScript output, verifies the Docker image and validates Kubernetes manifests with kubeconform.

## Error Contract

| Condition | Status | Code |
| --- | ---: | --- |
| Validation failure | 422 | `VALIDATION_ERROR` |
| Duplicate email | 409 | `CONFLICT` |
| Customer not found | 404 | `NOT_FOUND` |
| Dependency unavailable | 503 | `DEPENDENCY_UNAVAILABLE` |
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
- [x] Add cursor pagination and customer filtering
- [x] Add Prometheus-compatible service metrics
- [x] Add W3C trace-context propagation foundation
- [x] Add dependency-aware PostgreSQL readiness
- [x] Add Kubernetes deployment manifests
- [x] Validate Kubernetes manifests in CI
- [x] Add configurable OpenTelemetry OTLP/HTTP trace export

## Engineering Focus

This project demonstrates backend engineering beyond basic CRUD: dependency inversion, explicit service boundaries, deterministic failure semantics, migration-aware persistence, cursor pagination, query filtering, real database integration testing, dependency-aware readiness, operational correlation, metrics, OpenTelemetry tracing, containerized local development, Kubernetes deployment configuration and CI-backed verification.
