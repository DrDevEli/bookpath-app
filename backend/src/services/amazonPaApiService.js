/**
 * Amazon Product Advertising API (PA-API) v5 client — REAL prices.
 *
 * This replaces the fabricated `getBookPrice()` in amazonAffiliateService.js
 * (which uses Math.random() and MUST NOT be shown to users — Amazon Associates
 * ToS violation). This service signs requests with AWS Signature V4 (Node
 * crypto, no external deps) and returns actual Amazon offer prices.
 *
 * DORMANT / UNTESTED UNTIL CREDENTIALS EXIST: requires PA_API_ACCESS_KEY and
 * PA_API_SECRET_KEY from the Amazon Associates console (Product Advertising
 * API tab). Amazon typically grants API access only after 3 qualifying sales
 * within 180 days, so this is gated and does nothing until keys are present.
 * Do a live smoke-test against the real endpoint before wiring into any
 * user-facing surface.
 *
 * Env (all optional — service no-ops when keys absent):
 *   PA_API_ACCESS_KEY      — Access Key ID (from Amazon Associates)
 *   PA_API_SECRET_KEY      — Secret Access Key
 *   PA_API_PARTNER_TAG     — default: AMAZON_ASSOCIATES_TAG (bookpath0a20-20)
 *   PA_API_HOST            — default: webservices.amazon.de
 *   PA_API_REGION          — SigV4 region, default: eu-west-1
 *   PA_API_MARKETPLACE     — default: www.amazon.de
 *
 * NOTE: PA-API ToS requires caching price responses (~1h). Wire Redis caching
 * before going live at scale; the free tier is ~1 req/s (8640/day).
 */
import crypto from "crypto";
import logger from "../config/logger.js";

const config = {
  accessKey: process.env.PA_API_ACCESS_KEY || "",
  secretKey: process.env.PA_API_SECRET_KEY || "",
  partnerTag: process.env.PA_API_PARTNER_TAG || process.env.AMAZON_ASSOCIATES_TAG || "",
  host: process.env.PA_API_HOST || "webservices.amazon.de",
  region: process.env.PA_API_REGION || "eu-west-1",
  marketplace: process.env.PA_API_MARKETPLACE || "www.amazon.de",
};

const SERVICE = "ProductAdvertisingAPI";
const TARGET_PREFIX = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1";

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

/**
 * AWS Signature V4 (the same signing PA-API v5 requires).
 */
function signRequest({ method, host, region, service, accessKey, secretKey, path, query, headers, payload }) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256Hex(payload || "");

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k.toLowerCase()}:${String(headers[k]).trim()}\n`)
    .join("");
  const signedHeaders = Object.keys(headers)
    .sort()
    .map((k) => k.toLowerCase())
    .join(";");

  const canonicalRequest = [
    method,
    path || "/",
    query || "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  return {
    authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    amzDate,
  };
}

/**
 * POST to the PA-API endpoint. Returns the parsed JSON body.
 */
async function request(operation, body) {
  const path = `/paapi5/${operation.toLowerCase()}`;
  const payload = JSON.stringify(body);
  const target = `${TARGET_PREFIX}.${operation}`;

  // host is signed but NOT sent explicitly — undici sets Host from the URL
  // and rejects a manually-set host header.
  const signedHeaders = {
    "content-encoding": "amz-1.0", // required by PA-API v5
    "content-type": "application/json",
    "x-amz-target": target,
    host: config.host,
  };

  const { authorization, amzDate } = signRequest({
    method: "POST",
    host: config.host,
    region: config.region,
    service: SERVICE,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    path,
    query: "",
    headers: signedHeaders,
    payload,
  });

  const res = await fetch(`https://${config.host}${path}`, {
    method: "POST",
    headers: {
      "content-encoding": "amz-1.0",
      "content-type": "application/json",
      "x-amz-target": target,
      "x-amz-date": amzDate,
      authorization,
    },
    body: payload,
  });

  const json = await res.json();

  if (!res.ok || (json.Errors && json.Errors.length)) {
    const errs = (json.Errors || []).map((e) => `${e.Code}: ${e.Message}`).join(" | ");
    throw new Error(`PA-API ${operation} failed (HTTP ${res.status}): ${errs || res.statusText}`);
  }

  return json;
}

function isConfigured() {
  return Boolean(config.accessKey && config.secretKey && config.partnerTag);
}

/**
 * SearchItems — find items by ISBN or keyword. Returns the raw search result.
 */
async function searchItems(keywords, { searchIndex = "Books", itemPage = 1 } = {}) {
  const body = {
    Keywords: keywords,
    SearchIndex: searchIndex,
    ItemPage: itemPage,
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "ItemInfo.Classifications",
      "Offers.Listings.Price",
    ],
    PartnerTag: config.partnerTag,
    PartnerType: "Associates",
    Marketplace: config.marketplace,
  };
  const json = await request("SearchItems", body);
  return json.SearchResult?.Items || [];
}

/**
 * Extract the best (lowest) offer price from a PA-API item.
 * Amount is in the smallest currency unit (cents for EUR) — convert to major.
 */
function bestOffer(item) {
  const listings = item?.Offers?.Listings || [];
  if (!listings.length) return null;
  const priced = listings
    .filter((l) => l?.Price?.Amount != null)
    .sort((a, b) => a.Price.Amount - b.Price.Amount);
  if (!priced.length) return null;
  const p = priced[0].Price;
  return {
    amount: (p.Amount / 100).toFixed(2),
    currency: p.Currency,
    condition: priced[0].Condition?.Value || null,
    asin: item.ASIN,
    detailUrl: item.DetailPageURL || null,
    binding: item.ItemInfo?.Classifications?.Binding?.DisplayValue || null,
    title: item.ItemInfo?.Title?.DisplayValue || null,
  };
}

/**
 * Resolve the best ISBN from Google Books-style identifiers.
 */
function pickIsbn(book) {
  if (book.isbn) return String(book.isbn);
  const ids = book.industryIdentifiers || [];
  const isbn13 = ids.find((i) => i.type === "ISBN_13");
  const isbn10 = ids.find((i) => i.type === "ISBN_10");
  return isbn13?.identifier || isbn10?.identifier || null;
}

/**
 * Get the REAL Amazon price for a book. Returns an offer object or null.
 * Prefers ISBN lookup (exact), falls back to title+author keyword search.
 */
async function getBookPrice(book = {}) {
  if (!isConfigured()) {
    logger.debug("PA-API not configured, skipping real-price lookup");
    return null;
  }

  try {
    const isbn = pickIsbn(book);
    const keywords = isbn || [book.title, book.authors?.[0]].filter(Boolean).join(" ");

    const items = await searchItems(keywords);

    // Prefer an exact ISBN match when we searched by ISBN.
    if (isbn) {
      const exact = items.find((i) =>
        (i.ItemInfo?.ExternalIds?.ISBNs?.DisplayValues || []).includes(isbn)
      );
      if (exact) return bestOffer(exact);
    }

    const withPrice = items.map(bestOffer).filter(Boolean);
    return withPrice[0] || null;
  } catch (err) {
    logger.warn("PA-API price lookup failed", { error: err.message });
    return null;
  }
}

export default {
  isConfigured,
  searchItems,
  getBookPrice,
  config,
};
