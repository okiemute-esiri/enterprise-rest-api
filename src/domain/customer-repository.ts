import type { CreateCustomerInput, Customer, CustomerId, UpdateCustomerInput } from "./customer.js";

export interface CustomerRepository {
  list(): Promise<Customer[]>;
  findById(id: CustomerId): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  create(input: CreateCustomerInput): Promise<Customer>;
  update(id: CustomerId, input: UpdateCustomerInput): Promise<Customer | null>;
  delete(id: CustomerId): Promise<boolean>;
}
