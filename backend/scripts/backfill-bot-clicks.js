/**
 * Mark pre-existing CRAWLER click rows with isBot:true.
 *
 * WHY: before 2026-10-02 the app had no crawler detection, so /api/go recorded every
 * link-following crawler as an affiliate click. Measured: 1,873 of 1,896 click rows were
 * meta-externalagent (AS32934 Facebook, 116 IPs) and ZERO were readers — and those rows
 * were driving the public "Trending" carousel.
 *
 * THIS IS A MARKER, NOT A DELETE. History stays fully auditable; every reader-facing
 * metric now filters on { isBot: { $ne: true } }, so marking is enough to clean them up.
 * Revert with: db.analyticsevents.updateMany({isBot:true},{$unset:{isBot:""}})
 *
 * The pattern list mirrors backend/src/utils/botDetect.js — update both together.
 */
const db2 = db.getSiblingDB("bookpath");
const C = db2.analyticsevents;

const BOT = /bot\b|bot[/\s]|crawler|crawl\b|spider|slurp|facebookexternalhit|meta-externalagent|externalagent|facebookcatalog|whatsapp|telegrambot|slackbot|twitterbot|discordbot|linkedinbot|embedly|quora ?link ?preview|pinterest|skypeuripreview|googlebot|google-inspectiontool|bingbot|msnbot|adidxbot|duckduckbot|applebot|yandex|baiduspider|sogou|exabot|petalbot|bytespider|gptbot|chatgpt-user|claudebot|anthropic-ai|ccbot|perplexitybot|amazonbot|ia_archiver|archive\.org_bot|semrush|ahrefs|mj12bot|dotbot|seznam|screaming ?frog|uptimerobot|pingdom|statuscake|better ?uptime|site24x7|newrelicpinger|monitoring|feedfetcher|nuzzel|bitlybot|headlesschrome|phantomjs|puppeteer|playwright|lighthouse|curl[/\s]|wget[/\s]|libwww|python-requests|python-urllib|aiohttp|node-fetch|undici|go-http-client|okhttp|apache-httpclient|httpclient|guzzle|axios[/\s]|scrapy|java[/\s]|validator|preview/i;

const crawlerMatch = {
  type: "click",
  isBot: { $ne: true },
  $or: [
    { userAgent: { $exists: false } },
    { userAgent: null },
    { userAgent: "" },
    { userAgent: BOT },
  ],
};

print("=== BEFORE ===");
print("total click rows:            " + C.countDocuments({ type: "click" }));
print("already marked isBot:true:   " + C.countDocuments({ type: "click", isBot: true }));
print("rows this run will mark:     " + C.countDocuments(crawlerMatch));
print("");
print("sample of what will be marked:");
C.find(crawlerMatch, { userAgent: 1, source: 1, context: 1 }).limit(3).forEach((d) => {
  print("  " + String(d.userAgent).slice(0, 80) + "  | source=" + d.source + " | ctx=" + d.context);
});

const res = C.updateMany(crawlerMatch, { $set: { isBot: true } });

print("");
print("=== APPLIED ===");
print("matched:  " + res.matchedCount);
print("modified: " + res.modifiedCount);
print("");
print("=== AFTER ===");
print("click rows marked isBot:true: " + C.countDocuments({ type: "click", isBot: true }));
print("click rows counted as READER: " + C.countDocuments({ type: "click", isBot: { $ne: true } }));
print("");
print("reader clicks by source (this is what the dashboard will now show):");
printjson(C.aggregate([
  { $match: { type: "click", isBot: { $ne: true } } },
  { $group: { _id: "$source", n: { $sum: 1 } } },
  { $sort: { n: -1 } },
]).toArray());
print("");
print("what Trending will show now (top 10, readers only):");
printjson(C.aggregate([
  { $match: { type: "click", isBot: { $ne: true }, bookTitle: { $exists: true, $ne: null } } },
  { $sort: { timestamp: -1 } },
  { $group: { _id: "$bookId", title: { $first: "$bookTitle" }, clicks: { $sum: 1 } } },
  { $sort: { clicks: -1 } },
  { $limit: 10 },
]).toArray());
