import { createApp } from "./app.js";
import { InMemoryCustomerRepository } from "./infrastructure/in-memory-customer-repository.js";
import { PrismaCustomerRepository } from "./infrastructure/prisma-customer-repository.js";
import { checkPrismaReadiness, disconnectPrisma } from "./infrastructure/prisma.js";
import { shutdownTelemetry, startTelemetry } from "./infrastructure/telemetry.js";

const telemetryEnabled = startTelemetry();
const port = Number(process.env.PORT ?? 3000);
const useDatabase = Boolean(process.env.DATABASE_URL);
const repository = useDatabase
  ? new PrismaCustomerRepository()
  : new InMemoryCustomerRepository();
const readinessCheck = useDatabase ? checkPrismaReadiness : async () => undefined;
const app = createApp(repository, readinessCheck);

const server = app.listen(port, () => {
  console.log(
    `enterprise-rest-api listening on port ${port} using ${useDatabase ? "PostgreSQL/Prisma" : "in-memory"} persistence${telemetryEnabled ? " with OTLP tracing enabled" : ""}`,
  );
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async (error) => {
    if (error) {
      console.error("Failed to close HTTP server", error);
      process.exit(1);
    }

    try {
      if (useDatabase) {
        await disconnectPrisma();
      }
      await shutdownTelemetry();
      process.exit(0);
    } catch (shutdownError) {
      console.error("Failed during graceful shutdown", shutdownError);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
