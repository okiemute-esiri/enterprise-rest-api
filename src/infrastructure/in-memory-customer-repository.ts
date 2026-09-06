import { randomUUID } from "node:crypto";
import type { CreateCustomerInput, Customer, CustomerId, UpdateCustomerInput } from "../domain/customer.js";
import type { CustomerRepository } from "../domain/customer-repository.js";

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<CustomerId, Customer>();

  async list(): Promise<Customer[]> {
    return [...this.customers.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async findById(id: CustomerId): Promise<Customer | null> {
    return this.customers.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const normalized = email.trim().toLowerCase();
    return [...this.customers.values()].find((customer) => customer.email === normalized) ?? null;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const now = new Date().toISOString();
    const customer: Customer = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      createdAt: now,
      updatedAt: now
    };

    this.customers.set(customer.id, customer);
    return customer;
  }

  async update(id: CustomerId, input: UpdateCustomerInput): Promise<Customer | null> {
    const current = this.customers.get(id);
    if (!current) return null;

    const updated: Customer = {
      ...current,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      updatedAt: new Date().toISOString()
    };

    this.customers.set(id, updated);
    return updated;
  }

  async delete(id: CustomerId): Promise<boolean> {
    return this.customers.delete(id);
  }
}
