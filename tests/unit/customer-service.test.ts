import { describe, expect, it } from "vitest";
import { ConflictError, CustomerService } from "../../src/application/customer-service.js";
import { RepositoryConflictError, type CustomerRepository } from "../../src/domain/customer-repository.js";
import type { CreateCustomerInput, Customer, CustomerId, UpdateCustomerInput } from "../../src/domain/customer.js";

class ConflictRepository implements CustomerRepository {
  list(): Promise<Customer[]> {
    return Promise.resolve([]);
  }

  findById(_id: CustomerId): Promise<Customer | null> {
    return Promise.resolve(null);
  }

  findByEmail(_email: string): Promise<Customer | null> {
    return Promise.resolve(null);
  }

  create(_input: CreateCustomerInput): Promise<Customer> {
    return Promise.reject(new RepositoryConflictError("email already exists"));
  }

  update(_id: CustomerId, _input: UpdateCustomerInput): Promise<Customer | null> {
    return Promise.reject(new RepositoryConflictError("email already exists"));
  }

  delete(_id: CustomerId): Promise<boolean> {
    return Promise.resolve(false);
  }
}

describe("CustomerService persistence conflicts", () => {
  it("maps a create repository conflict to the application conflict contract", async () => {
    const service = new CustomerService(new ConflictRepository());

    await expect(
      service.create({ name: "Grace Hopper", email: "grace@example.com" })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("maps an update repository conflict to the application conflict contract", async () => {
    const service = new CustomerService(new ConflictRepository());

    await expect(
      service.update("customer-1", { email: "grace@example.com" })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
