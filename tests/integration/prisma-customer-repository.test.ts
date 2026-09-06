import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { RepositoryConflictError } from "../../src/domain/customer-repository.js";
import { PrismaCustomerRepository } from "../../src/infrastructure/prisma-customer-repository.js";
import { prisma } from "../../src/infrastructure/prisma.js";

const repository = new PrismaCustomerRepository();

describe("PrismaCustomerRepository", () => {
  beforeEach(async () => {
    await prisma.customer.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists and retrieves normalized customer data", async () => {
    const created = await repository.create({
      name: "  Ada Lovelace  ",
      email: "  ADA@EXAMPLE.COM  "
    });

    expect(created.name).toBe("Ada Lovelace");
    expect(created.email).toBe("ada@example.com");

    const fetched = await repository.findByEmail("ADA@example.com");
    expect(fetched?.id).toBe(created.id);
  });

  it("translates PostgreSQL unique constraint violations to RepositoryConflictError", async () => {
    await repository.create({ name: "Grace Hopper", email: "grace@example.com" });

    await expect(
      repository.create({ name: "Another Grace", email: "GRACE@example.com" })
    ).rejects.toBeInstanceOf(RepositoryConflictError);
  });

  it("updates and deletes persisted customers", async () => {
    const created = await repository.create({ name: "Alan Turing", email: "alan@example.com" });

    const updated = await repository.update(created.id, {
      name: "Alan M. Turing",
      email: "turing@example.com"
    });

    expect(updated?.name).toBe("Alan M. Turing");
    expect(updated?.email).toBe("turing@example.com");

    await expect(repository.delete(created.id)).resolves.toBe(true);
    await expect(repository.findById(created.id)).resolves.toBeNull();
  });
});
