import type { CreateCustomerInput, Customer, CustomerId, UpdateCustomerInput } from "../domain/customer.js";
import { RepositoryConflictError, type CustomerRepository } from "../domain/customer-repository.js";

export class ConflictError extends Error {}
export class NotFoundError extends Error {}

export class CustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  list(): Promise<Customer[]> {
    return this.repository.list();
  }

  async get(id: CustomerId): Promise<Customer> {
    const customer = await this.repository.findById(id);
    if (!customer) throw new NotFoundError("Customer not found");
    return customer;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) throw new ConflictError("A customer with this email already exists");

    try {
      return await this.repository.create(input);
    } catch (error) {
      if (error instanceof RepositoryConflictError) throw new ConflictError(error.message);
      throw error;
    }
  }

  async update(id: CustomerId, input: UpdateCustomerInput): Promise<Customer> {
    if (input.email) {
      const existing = await this.repository.findByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new ConflictError("A customer with this email already exists");
      }
    }

    try {
      const customer = await this.repository.update(id, input);
      if (!customer) throw new NotFoundError("Customer not found");
      return customer;
    } catch (error) {
      if (error instanceof RepositoryConflictError) throw new ConflictError(error.message);
      throw error;
    }
  }

  async delete(id: CustomerId): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError("Customer not found");
  }
}
