import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("customer API", () => {
  it("creates, reads, updates and deletes a customer", async () => {
    const app = createApp();

    const created = await request(app)
      .post("/api/v1/customers")
      .send({ name: "Ada Lovelace", email: "ada@example.com" })
      .expect(201);

    const id = created.body.data.id as string;
    expect(created.body.data.email).toBe("ada@example.com");

    await request(app)
      .get(`/api/v1/customers/${id}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.name).toBe("Ada Lovelace");
      });

    await request(app)
      .patch(`/api/v1/customers/${id}`)
      .send({ name: "Ada Byron" })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.name).toBe("Ada Byron");
      });

    await request(app).delete(`/api/v1/customers/${id}`).expect(204);
    await request(app).get(`/api/v1/customers/${id}`).expect(404);
  });

  it("applies baseline HTTP security headers", async () => {
    const app = createApp();
    const response = await request(app).get("/health").expect(200);

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["content-security-policy"]).toBeTruthy();
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("generates and preserves request correlation IDs", async () => {
    const app = createApp();
    const generated = await request(app).get("/health").expect(200);
    expect(generated.headers["x-request-id"]).toBeTruthy();

    const supplied = await request(app)
      .get("/health")
      .set("x-request-id", "enterprise-rest-api-request-123")
      .expect(200);
    expect(supplied.headers["x-request-id"]).toBe("enterprise-rest-api-request-123");
  });

  it("propagates W3C trace context and generates a child span", async () => {
    const app = createApp();
    const traceId = "0123456789abcdef0123456789abcdef";
    const parentSpanId = "0123456789abcdef";
    const response = await request(app)
      .get("/health")
      .set("traceparent", `00-${traceId}-${parentSpanId}-01`)
      .expect(200);

    const returned = response.headers.traceparent as string;
    const match = returned.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-01$/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(traceId);
    expect(match?.[2]).not.toBe(parentSpanId);
  });

  it("reports readiness when required dependencies are available", async () => {
    const app = createApp(undefined, async () => undefined);
    const response = await request(app).get("/ready").expect(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  it("reports not ready when a required dependency is unavailable", async () => {
    const app = createApp(undefined, async () => {
      throw new Error("database unavailable");
    });
    const response = await request(app).get("/ready").expect(503);
    expect(response.body).toEqual({
      status: "not_ready",
      error: {
        code: "DEPENDENCY_UNAVAILABLE",
        message: "A required dependency is unavailable"
      }
    });
  });

  it("exposes Prometheus-compatible HTTP metrics", async () => {
    const app = createApp();
    await request(app).get("/health").expect(200);
    const metrics = await request(app).get("/metrics").expect(200);

    expect(metrics.headers["content-type"]).toContain("text/plain");
    expect(metrics.text).toContain("enterprise_rest_api_http_requests_total");
    expect(metrics.text).toContain("enterprise_rest_api_http_request_duration_seconds_sum");
    expect(metrics.text).toContain("enterprise_rest_api_process_uptime_seconds");
  });

  it("paginates customer listings and returns a cursor", async () => {
    const app = createApp();
    for (const [name, email] of [
      ["Ada Lovelace", "ada@example.com"],
      ["Grace Hopper", "grace@example.com"],
      ["Katherine Johnson", "katherine@example.com"]
    ]) {
      await request(app).post("/api/v1/customers").send({ name, email }).expect(201);
    }

    const first = await request(app).get("/api/v1/customers?limit=2").expect(200);
    expect(first.body.data).toHaveLength(2);
    expect(first.body.meta.limit).toBe(2);
    expect(first.body.meta.nextCursor).toBeTruthy();

    const second = await request(app)
      .get(`/api/v1/customers?limit=2&cursor=${first.body.meta.nextCursor}`)
      .expect(200);
    expect(second.body.data).toHaveLength(1);
    expect(second.body.meta.nextCursor).toBeNull();

    const seen = [...first.body.data, ...second.body.data].map((customer) => customer.id);
    expect(new Set(seen).size).toBe(3);
  });

  it("filters customers by name or email", async () => {
    const app = createApp();
    await request(app).post("/api/v1/customers").send({ name: "Ada Lovelace", email: "ada@example.com" }).expect(201);
    await request(app).post("/api/v1/customers").send({ name: "Grace Hopper", email: "grace@example.com" }).expect(201);

    const byName = await request(app).get("/api/v1/customers?q=grace").expect(200);
    expect(byName.body.data).toHaveLength(1);
    expect(byName.body.data[0].name).toBe("Grace Hopper");

    const byEmail = await request(app).get("/api/v1/customers?q=ada%40example.com").expect(200);
    expect(byEmail.body.data).toHaveLength(1);
    expect(byEmail.body.data[0].email).toBe("ada@example.com");
  });

  it("rejects invalid customer payloads", async () => {
    const app = createApp();

    await request(app)
      .post("/api/v1/customers")
      .send({ name: "A", email: "invalid" })
      .expect(422);
  });

  it("enforces unique email addresses", async () => {
    const app = createApp();
    const payload = { name: "Grace Hopper", email: "grace@example.com" };

    await request(app).post("/api/v1/customers").send(payload).expect(201);
    await request(app).post("/api/v1/customers").send(payload).expect(409);
  });
});
