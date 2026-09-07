import { randomBytes } from "node:crypto";

const requestCounts = new Map<string, number>();
const requestDurationSeconds = new Map<string, number>();
const processStartedAt = Date.now();

function labels(method: string, path: string, statusCode: number): string {
  const escapedPath = path.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `method="${method}",path="${escapedPath}",status="${statusCode}"`;
}

export function recordHttpRequest(method: string, path: string, statusCode: number, durationMs: number): void {
  const key = labels(method, path, statusCode);
  requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);
  requestDurationSeconds.set(key, (requestDurationSeconds.get(key) ?? 0) + durationMs / 1000);
}

export function renderPrometheusMetrics(): string {
  const lines = [
    "# HELP enterprise_rest_api_http_requests_total Total HTTP requests handled.",
    "# TYPE enterprise_rest_api_http_requests_total counter"
  ];

  for (const [labelSet, count] of requestCounts) {
    lines.push(`enterprise_rest_api_http_requests_total{${labelSet}} ${count}`);
  }

  lines.push(
    "# HELP enterprise_rest_api_http_request_duration_seconds_sum Cumulative HTTP request duration in seconds.",
    "# TYPE enterprise_rest_api_http_request_duration_seconds_sum counter"
  );

  for (const [labelSet, seconds] of requestDurationSeconds) {
    lines.push(`enterprise_rest_api_http_request_duration_seconds_sum{${labelSet}} ${seconds}`);
  }

  lines.push(
    "# HELP enterprise_rest_api_process_uptime_seconds Process uptime in seconds.",
    "# TYPE enterprise_rest_api_process_uptime_seconds gauge",
    `enterprise_rest_api_process_uptime_seconds ${(Date.now() - processStartedAt) / 1000}`
  );

  return `${lines.join("\n")}\n`;
}

const traceparentPattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

export type TraceContext = {
  traceId: string;
  parentSpanId: string | null;
  spanId: string;
  traceparent: string;
};

export function createTraceContext(incomingTraceparent?: string): TraceContext {
  const match = incomingTraceparent?.trim().match(traceparentPattern);
  const traceId = match?.[1]?.toLowerCase() ?? randomBytes(16).toString("hex");
  const parentSpanId = match?.[2]?.toLowerCase() ?? null;
  const flags = match?.[3]?.toLowerCase() ?? "01";
  const spanId = randomBytes(8).toString("hex");
  return {
    traceId,
    parentSpanId,
    spanId,
    traceparent: `00-${traceId}-${spanId}-${flags}`
  };
}
