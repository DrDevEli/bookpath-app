/**
 * Health check — exits 0 when the backend is healthy, 1 otherwise.
 * Designed for uptime monitors (UptimeRobot, cron, systemd, Docker HEALTHCHECK).
 *
 * Usage (from backend/):
 *   node scripts/healthCheck.js
 *
 * Env: HEALTH_URL (default http://localhost:PORT/health, PORT default 3001)
 */
import "./loadEnv.js"; // MUST be first — loads backend/.env before PORT is read below

const url = process.env.HEALTH_URL || `http://localhost:${process.env.PORT || 3001}/health`;

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`Health check failed: HTTP ${res.status}`);
      process.exit(1);
    }
    const body = await res.json();
    const healthy = body.status === "ok" && body.mongodb === "connected";
    if (!healthy) {
      console.error(`Health check degraded: ${JSON.stringify(body)}`);
      process.exit(1);
    }
    console.log(`OK: mongodb=${body.mongodb} redis=${body.redis} env=${body.environment}`);
    process.exit(0);
  } catch (err) {
    clearTimeout(timer);
    console.error(`Health check error: ${err.message}`);
    process.exit(1);
  }
}

main();
