import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { CustomerService, ConflictError, NotFoundError } from "./application/customer-service.js";
import type { CustomerRepository } from "./domain/customer-repository.js";
import { InMemoryCustomerRepository } from "./infrastructure/in-memory-customer-repository.js";

const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254)
});

const updateCustomerSchema = createCustomerSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be supplied" }
);

export function createApp(repository: CustomerRepository = new InMemoryCustomerRepository()) {
  const app = express();
  const service = new CustomerService(repository);

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/ready", (_req, res) => {
    res.status(200).json({ status: "ready" });
  });

  app.get("/api/v1/customers", async (_req, res, next) => {
    try {
      res.json({ data: await service.list() });
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

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
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

    console.error(error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" }
    });
  });

  return app;
}
