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
