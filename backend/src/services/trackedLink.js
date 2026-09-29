import crypto from "crypto";

/**
 * Tracked outbound links — the attribution layer between a social/SEO reader
 * and the Amazon checkout.
 *
 * WHY THIS EXISTS
 * An Amazon URL rendered straight into HTML is unmeasurable: the click leaves
 * our domain and we never learn it happened. Before this module every
 * server-rendered CTA (landing pages, book pages) pointed straight at
 * amazon.<tld>, so ALL landing-page traffic — i.e. every visitor arriving from
 * Instagram, Pinterest or Google — produced precisely zero analytics rows, and
 * the visitor's acquisition channel was unknowable by construction.
 *
 * The fix is a signed same-origin redirect: the rendered page links to
 *   /api/go?u=<destination>&b=<bookId>&c=<context>&s=<channel>&sig=<hmac>
 * the endpoint verifies the signature, records the click and 302s to Amazon.
 *
 * SECURITY
 * - The destination is never trusted from the client: only a URL we signed can
 *   be redirected to, and only to an Amazon host we recognise. That is what
 *   stops this being an open redirect (the classic "?url=" vulnerability).
 * - The signature covers every field that reaches the analytics row, so a
 *   third party cannot forge a click or relabel a channel.
 *
 * QUOTA NOTE
 * No Google Books request happens at click time — the destination was already
 * built, per request, while rendering. A click therefore still works on a day
 * when the Google quota is exhausted, unlike /api/books/:id/affiliate-click
 * which has to look the volume up first.
 */

// Acquisition channels accepted as `source`. MUST stay a subset of the
// AnalyticsEvent.source enum (models/AnalyticsEvent.js) — analyticsService
// coerces anything unknown to "direct" rather than dropping the event.
export const CHANNELS = new Set([
  "instagram",
  "pinterest",
  "social",
  "seo",
  "email",
  "link-hub",
  "direct",
]);

const SIG_LENGTH = 32;

// Hosts we are willing to 302 to. Populated from the same env the affiliate
// link builder uses, so the allowlist cannot drift from the tag configuration.
function amazonHosts() {
  const hosts = new Set(["www.amazon.de", "www.amazon.com"]);
  const de = (process.env.AMAZON_DOMAIN || "amazon.de").toLowerCase();
  const us = (process.env.AMAZON_US_DOMAIN || "amazon.com").toLowerCase();
  hosts.add(de);
  hosts.add(us);
  return hosts;
}

// Referrer host → channel, used when a link carries no explicit source (e.g. a
// visitor reached a landing page some other way and then clicked through).
const REFERRER_RULES = [
  [/(^|\.)instagram\.com$/i, "instagram"],
  [/(^|\.)pinterest\.[a-z.]+$/i, "pinterest"],
  [/(^|\.)(t\.co|twitter\.com|x\.com|facebook\.com|reddit\.com|linkedin\.com|threads\.net|bsky\.app)$/i, "social"],
  [/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|ecosia\.org|search\.brave\.com|startpage\.com)$/i, "seo"],
];

function signingSecret() {
  return process.env.GO_LINK_SECRET || process.env.JWT_SECRET || "";
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * The exact string that gets signed. Both signing and verification must build
 * it identically, so it lives in one function.
 */
export function canonicalPayload({ url, source, context, bookId, bookTitle, coverImage, authors }) {
  return [url, source, context, bookId, bookTitle, coverImage, authors].map((v) => String(v ?? "")).join("|");
}

export function signTracked(params) {
  const secret = signingSecret();
  if (!secret) throw new Error("No tracking-link secret configured (GO_LINK_SECRET or JWT_SECRET)");
  return crypto
    .createHmac("sha256", secret)
    .update(canonicalPayload(params))
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, SIG_LENGTH);
}

function signaturesMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function isAmazonDestination(url) {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === "https:" && amazonHosts().has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function marketForDestination(url) {
  try {
    return new URL(String(url)).hostname.toLowerCase().endsWith("amazon.com") ? "us" : "de";
  } catch {
    return "de";
  }
}

/**
 * Build the on-site tracked link for an outbound Amazon URL.
 * Returns a ROOT-RELATIVE url so it works on any host (apex, www, localhost)
 * and can never be cached as an absolute URL pointing somewhere else.
 */
export function buildTrackedUrl({ url, source, context, bookId, bookTitle, coverImage, authors, path = "/api/go" }) {
  if (!url) return "";
  const params = {
    url,
    source: source || "",
    context: context || "",
    bookId: bookId || "",
    bookTitle: bookTitle || "",
    coverImage: coverImage || "",
    authors: authors || "",
  };
  const query = new URLSearchParams({
    u: params.url,
    s: params.source,
    c: params.context,
    b: params.bookId,
    bt: params.bookTitle,
    ci: params.coverImage,
    au: params.authors,
    sig: signTracked(params),
  });
  return `${path}?${query.toString()}`;
}

/**
 * Verify an inbound /api/go request. Returns { ok: true, ...fields } or
 * { ok: false, reason } — never throws.
 */
export function verifyTracked(query = {}) {
  const fields = {
    url: String(query.u || ""),
    source: String(query.s || ""),
    context: String(query.c || ""),
    bookId: String(query.b || ""),
    bookTitle: String(query.bt || ""),
    coverImage: String(query.ci || ""),
    authors: String(query.au || ""),
  };
  const sig = query.sig;

  if (!fields.url || !sig) return { ok: false, reason: "missing-params" };
  if (!isAmazonDestination(fields.url)) return { ok: false, reason: "destination-not-allowed" };

  let expected;
  try {
    expected = signTracked(fields);
  } catch (err) {
    return { ok: false, reason: `signing-unavailable:${err.message}` };
  }
  if (!signaturesMatch(String(sig), expected)) return { ok: false, reason: "bad-signature" };

  return { ok: true, ...fields };
}

export function normalizeChannel(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return CHANNELS.has(v) ? v : null;
}

/**
 * Decide which acquisition channel a click belongs to.
 * Precedence: explicit signed source → first-party channel cookie → referrer
 * host → "direct". The cookie is what makes a multi-page visit attributable:
 * the landing page is cached, so it cannot carry the channel into its own CTA.
 */
export function resolveChannel({ explicit, cookieSource, referrer } = {}) {
  const fromParam = normalizeChannel(explicit);
  if (fromParam) return fromParam;

  const fromCookie = normalizeChannel(cookieSource);
  if (fromCookie) return fromCookie;

  if (referrer) {
    let host = "";
    try {
      host = new URL(String(referrer)).hostname;
    } catch {
      host = "";
    }
    if (host) {
      for (const [pattern, channel] of REFERRER_RULES) {
        if (pattern.test(host)) return channel;
      }
    }
  }

  return "direct";
}

export default {
  CHANNELS,
  buildTrackedUrl,
  verifyTracked,
  isAmazonDestination,
  marketForDestination,
  normalizeChannel,
  resolveChannel,
  signTracked,
  canonicalPayload,
};
