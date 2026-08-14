/**
 * KPI report — prints the affiliate funnel from the Phase 1 analytics store.
 * Reads MongoDB directly (reuses analyticsService, the same logic the /analytics
 * endpoints use). Pipe to email / Slack in production.
 *
 * Usage (from backend/):
 *   node scripts/kpiReport.js
 */
import "./loadEnv.js"; // MUST be first — loads backend/.env before other modules read process.env

import mongoose from "mongoose";
import analyticsService from "../src/services/analyticsService.js";

const pct = (n) => (n * 100).toFixed(2) + "%";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 5000 });

  const [overview, topBooks, topQueries, daily] = await Promise.all([
    analyticsService.getOverview(),
    analyticsService.getTopBooks({ days: 30, limit: 10 }),
    analyticsService.getTopQueries({ days: 30, limit: 10 }),
    analyticsService.getDailyClicks({ days: 14 }),
  ]);

  const impressions = overview.impressions.total || 0;
  const clicks = overview.clicks.total || 0;
  const ctr = impressions > 0 ? pct(clicks / impressions) : "n/a";

  const lines = [];
  lines.push("=== BookPath KPI Report ===");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("Affiliate funnel:");
  lines.push(`  Impressions: total ${overview.impressions.total} | 7d ${overview.impressions.last7d} | today ${overview.impressions.today}`);
  lines.push(`  Clicks:      total ${overview.clicks.total} | 7d ${overview.clicks.last7d} | today ${overview.clicks.today}`);
  lines.push(`  CTR:         ${ctr}`);
  lines.push(`  Unique books clicked: ${overview.uniqueBooksClicked}`);
  lines.push("");
  lines.push("Clicks by source:");
  for (const s of overview.clicksBySource || []) lines.push(`  ${s.source}: ${s.count}`);
  lines.push("");
  lines.push("Top books (30d):");
  (topBooks || []).forEach((b, i) => lines.push(`  ${i + 1}. ${b.bookTitle || b._id} — ${b.clicks} clicks`));
  lines.push("");
  lines.push("Top queries by CTR (30d):");
  for (const q of topQueries || []) {
    const qctr = q.impressions > 0 ? pct(q.clicks / q.impressions) : "n/a";
    lines.push(`  ${q._id}: ${q.clicks} clicks / ${q.impressions} imp = ${qctr}`);
  }
  lines.push("");
  lines.push("Clicks per day (14d):");
  for (const d of daily || []) lines.push(`  ${d._id}: ${d.clicks}`);

  console.log(lines.join("\n"));
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error("KPI report failed:", err.message);
  process.exitCode = 1;
});
