import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";

let telemetrySdk: NodeSDK | null = null;

function traceEndpoint(): string | undefined {
  const explicit = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim();
  if (explicit) {
    return explicit;
  }

  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!base) {
    return undefined;
  }

  return `${base.replace(/\/$/, "")}/v1/traces`;
}

export function startTelemetry(): boolean {
  if (process.env.OTEL_SDK_DISABLED?.toLowerCase() === "true") {
    return false;
  }

  const endpoint = traceEndpoint();
  if (!endpoint) {
    return false;
  }

  telemetrySdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: endpoint })
  });
  telemetrySdk.start();
  return true;
}

export async function shutdownTelemetry(): Promise<void> {
  if (!telemetrySdk) {
    return;
  }

  await telemetrySdk.shutdown();
  telemetrySdk = null;
}
