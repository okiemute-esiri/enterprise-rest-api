import { createApp } from "./app.js";
import { InMemoryCustomerRepository } from "./infrastructure/in-memory-customer-repository.js";
import { PrismaCustomerRepository } from "./infrastructure/prisma-customer-repository.js";
import { checkPrismaReadiness, disconnectPrisma } from "./infrastructure/prisma.js";

const port = Number(process.env.PORT ?? 3000);
const useDatabase = Boolean(process.env.DATABASE_URL);
const repository = useDatabase
  ? new PrismaCustomerRepository()
  : new InMemoryCustomerRepository();
const readinessCheck = useDatabase ? checkPrismaReadiness : async () => undefined;
const app = createApp(repository, readinessCheck);

const server = app.listen(port, () => {
  console.log(
    `enterprise-rest-api listening on port ${port} using ${useDatabase ? "PostgreSQL/Prisma" : "in-memory"} persistence`,
  );
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async (error) => {
    if (error) {
      console.error("Failed to close HTTP server", error);
      process.exit(1);
    }

    if (useDatabase) {
      await disconnectPrisma();
    }

    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
