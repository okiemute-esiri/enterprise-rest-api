import { randomUUID } from "node:crypto";
import {
  context,
  isSpanContextValid,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace as otelTrace
} from "@opentelemetry/api";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { CustomerService, ConflictError, NotFoundError } from "./application/customer-service.js";
import type { CustomerRepository } from "./domain/customer-repository.js";
import { InMemoryCustomerRepository } from "./infrastructure/in-memory-customer-repository.js";
import {
  createTraceContext,
  recordHttpRequest,
  renderPrometheusMetrics
} from "./infrastructure/observability.js";

const tracer = otelTrace.getTracer("enterprise-rest-api");

const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254)
});

const updateCustomerSchema = createCustomerSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be supplied" }
);

const listCustomersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  q: z.string().trim().min(1).max(100).optional()
});

type ReadinessCheck = () => Promise<void>;

export function createApp(
  repository: CustomerRepository = new InMemoryCustomerRepository(),
  readinessCheck: ReadinessCheck = async () => undefined
) {
  const app = express();
  const service = new CustomerService(repository);

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    const incomingRequestId = req.header("x-request-id")?.trim();
    const requestId = incomingRequestId || randomUUID();
    const fallbackTrace = createTraceContext(req.header("traceparent"));
    const parentContext = propagation.extract(context.active(), req.headers);
    const span = tracer.startSpan(
      `${req.method} ${req.path}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          "http.request.method": req.method,
          "url.path": req.path,
          "http.request_id": requestId
        }
      },
      parentContext
    );
    const spanContext = span.spanContext();
    const traceContext = isSpanContextValid(spanContext)
      ? {
          traceId: spanContext.traceId,
          parentSpanId: fallbackTrace.parentSpanId,
          spanId: spanContext.spanId,
          traceparent: `00-${spanContext.traceId}-${spanContext.spanId}-${(spanContext.traceFlags & 1) === 1 ? "01" : "00"}`
        }
      : fallbackTrace;

    res.setHeader("x-request-id", requestId);
    res.setHeader("traceparent", traceContext.traceparent);

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const routePath = typeof req.route?.path === "string" ? req.route.path : req.path;
      recordHttpRequest(req.method, routePath, res.statusCode, durationMs);
      span.setAttributes({
        "http.response.status_code": res.statusCode,
        "http.route": routePath
      });
      if (res.statusCode >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.end();

      console.log(JSON.stringify({
        level: "info",
        event: "http_request_completed",
        requestId,
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
        parentSpanId: traceContext.parentSpanId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2))
      }));
    });

    context.with(otelTrace.setSpan(parentContext, span), () => next());
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/ready", async (_req, res) => {
    try {
      await readinessCheck();
      res.status(200).json({ status: "ready" });
    } catch {
      res.status(503).json({
        status: "not_ready",
        error: { code: "DEPENDENCY_UNAVAILABLE", message: "A required dependency is unavailable" }
      });
    }
  });

  app.get("/metrics", (_req, res) => {
    res.type("text/plain; version=0.0.4; charset=utf-8").send(renderPrometheusMetrics());
  });

  app.get("/api/v1/customers", async (req, res, next) => {
    try {
      const query = listCustomersSchema.parse(req.query);
      const page = await service.list({
        limit: query.limit,
        ...(query.cursor ? { cursor: query.cursor } : {}),
        ...(query.q ? { query: query.q } : {})
      });
      res.json({
        data: page.items,
        meta: { limit: query.limit, nextCursor: page.nextCursor }
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/customers", async (req, res, next) => {
    try {
      const input = createCustomerSchema.parse(req.body);
      const customer = await service.create(input);
      res.status(201).json({ data: customer });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/customers/:customerId", async (req, res, next) => {
    try {
      const customer = await service.get(req.params.customerId);
      res.json({ data: customer });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/v1/customers/:customerId", async (req, res, next) => {
    try {
      const input = updateCustomerSchema.parse(req.body);
      const customer = await service.update(req.params.customerId, input);
      res.json({ data: customer });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/v1/customers/:customerId", async (req, res, next) => {
    try {
      await service.delete(req.params.customerId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: "ROUTE_NOT_FOUND", message: "Route not found" }
    });
  });

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.issues
        }
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: error.message } });
    }

    if (error instanceof ConflictError) {
      return res.status(409).json({ error: { code: "CONFLICT", message: error.message } });
    }

    console.error(JSON.stringify({
      level: "error",
      event: "unhandled_error",
      requestId: res.getHeader("x-request-id"),
      traceparent: res.getHeader("traceparent"),
      method: req.method,
      path: req.path,
      error: error instanceof Error ? { name: error.name, message: error.message } : { message: "Unknown error" }
    }));
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" }
    });
  });

  return app;
}
