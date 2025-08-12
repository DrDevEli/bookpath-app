import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const externalApiLatency = new client.Histogram({
  name: "external_api_latency_ms",
  help: "External API latency in ms",
  labelNames: ["service"],
  buckets: [50, 100, 200, 400, 800, 1200, 2000, 5000],
});

export const externalApiRequests = new client.Counter({
  name: "external_api_requests_total",
  help: "Total external API requests",
  labelNames: ["service", "status"],
});

export const externalApiErrors = new client.Counter({
  name: "external_api_errors_total",
  help: "Total external API errors",
  labelNames: ["service"],
});

register.registerMetric(externalApiLatency);
register.registerMetric(externalApiRequests);
register.registerMetric(externalApiErrors);

export async function getMetrics() {
  return register.metrics();
}

export default register;


