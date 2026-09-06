export type CustomerId = string;

export interface Customer {
  id: CustomerId;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
}

export interface UpdateCustomerInput {
  name?: string | undefined;
  email?: string | undefined;
}
