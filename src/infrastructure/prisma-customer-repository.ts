import { Prisma, type Customer as PrismaCustomer } from "@prisma/client";
import type { CreateCustomerInput, Customer, CustomerId, UpdateCustomerInput } from "../domain/customer.js";
import { RepositoryConflictError, type CustomerListOptions, type CustomerPage, type CustomerRepository } from "../domain/customer-repository.js";
import { prisma } from "./prisma.js";

function toDomain(customer: PrismaCustomer): Customer {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString()
  };
}

function translateWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new RepositoryConflictError("A customer with this email already exists");
  }
  throw error;
}

export class PrismaCustomerRepository implements CustomerRepository {
  async list(options: CustomerListOptions): Promise<CustomerPage> {
    const query = options.query?.trim();
    const customers = await prisma.customer.findMany({
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      ...(query ? {
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query.toLowerCase(), mode: "insensitive" } }
          ]
        }
      } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: options.limit + 1
    });

    const hasMore = customers.length > options.limit;
    const pageCustomers = hasMore ? customers.slice(0, options.limit) : customers;
    const items = pageCustomers.map(toDomain);

    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null
    };
  }

  async findById(id: CustomerId): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({ where: { id } });
    return customer ? toDomain(customer) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({
      where: { email: email.trim().toLowerCase() }
    });
    return customer ? toDomain(customer) : null;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    try {
      const customer = await prisma.customer.create({
        data: { name: input.name.trim(), email: input.email.trim().toLowerCase() }
      });
      return toDomain(customer);
    } catch (error) {
      return translateWriteError(error);
    }
  }

  async update(id: CustomerId, input: UpdateCustomerInput): Promise<Customer | null> {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return null;

    try {
      const customer = await prisma.customer.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {})
        }
      });
      return toDomain(customer);
    } catch (error) {
      return translateWriteError(error);
    }
  }

  async delete(id: CustomerId): Promise<boolean> {
    const result = await prisma.customer.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
