/**
 * Crawler detection for the analytics layer.
 *
 * WHY THIS EXISTS. `/api/go` is a real `href` in server-rendered landing pages, and it
 * records the click BEFORE it 302s. At the HTTP level a link-following crawler is
 * therefore indistinguishable from a reader — except by its User-Agent.
 *
 * Measured 2026-10-02: 1,873 of 1,896 click rows were `meta-externalagent/1.1`
 * (AS32934 Facebook, 116 IPs), and NOT ONE of them was a human. Worse, those bogus
 * clicks drive the public "Trending" carousel, so crawler noise was being promoted on
 * the homepage as what readers like.
 *
 * DESIGN RULES:
 *  - A bot is STILL redirected. The funnel must never break for a real user, and a
 *    mislabelled row is harmless while a broken redirect costs money.
 *  - FAIL OPEN. No UA, or a detector error, is treated as a HUMAN. Silently discarding
 *    a real reader's click is the worst failure mode a measurement layer can have —
 *    the same reasoning that made `normalizeSource` coerce instead of reject.
 *  - Bot hits are still RECORDED (with isBot:true), never dropped: the volume is worth
 *    seeing, it just must not count as a reader.
 */

const CRAWLER_PATTERNS = [
  // generic
  /bot\b/i, /bot[/\s]/i, /crawler/i, /crawl\b/i, /spider/i, /slurp/i,
  // social / preview fetchers (these FOLLOW links, unlike old facebookexternalhit)
  /facebookexternalhit/i, /meta-externalagent/i, /externalagent/i, /facebookcatalog/i,
  /whatsapp/i, /telegrambot/i, /slackbot/i, /twitterbot/i, /discordbot/i,
  /linkedinbot/i, /embedly/i, /quora ?link ?preview/i, /pinterest/i, /skypeuripreview/i,
  // search + AI crawlers
  /googlebot/i, /google-inspectiontool/i, /bingbot/i, /msnbot/i, /adidxbot/i,
  /duckduckbot/i, /applebot/i, /yandex/i, /baiduspider/i, /sogou/i, /exabot/i,
  /petalbot/i, /bytespider/i, /gptbot/i, /chatgpt-user/i, /claudebot/i, /anthropic-ai/i,
  /ccbot/i, /perplexitybot/i, /amazonbot/i, /ia_archiver/i, /archive\.org_bot/i,
  // SEO / uptime / monitoring
  /semrush/i, /ahrefs/i, /mj12bot/i, /dotbot/i, /seznam/i, /screaming ?frog/i,
  /uptimerobot/i, /pingdom/i, /statuscake/i, /better ?uptime/i, /site24x7/i,
  /newrelicpinger/i, /monitoring/i, /feedfetcher/i, /nuzzel/i, /bitlybot/i,
  // headless browsers + scripted clients
  /headlesschrome/i, /phantomjs/i, /puppeteer/i, /playwright/i, /lighthouse/i,
  /curl[/\s]/i, /wget[/\s]/i, /libwww/i, /python-requests/i, /python-urllib/i,
  /aiohttp/i, /node-fetch/i, /undici/i, /go-http-client/i, /okhttp/i,
  /apache-httpclient/i, /httpclient/i, /guzzle/i, /axios[/\s]/i, /scrapy/i,
  /java[/\s]/i,
  // misc validators
  /validator/i, /preview/i,
];

/**
 * @returns {{isBot: boolean, reason: string|null}}
 */
export function classifyUserAgent(ua) {
  if (typeof ua !== "string" || ua.trim() === "") {
    // A real browser always sends a UA; an empty one is a script.
    return { isBot: true, reason: "missing-user-agent" };
  }
  for (const re of CRAWLER_PATTERNS) {
    if (re.test(ua)) return { isBot: true, reason: re.source };
  }
  return { isBot: false, reason: null };
}

/**
 * Classify an Express request. Never throws — fails OPEN (human) on any error.
 */
export function isBotRequest(req) {
  try {
    return classifyUserAgent(req?.headers?.["user-agent"]);
  } catch {
    return { isBot: false, reason: "detector-error" };
  }
}

export default isBotRequest;
