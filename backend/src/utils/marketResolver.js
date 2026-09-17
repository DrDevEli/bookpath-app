/**
 * Server-side Amazon marketplace resolution.
 *
 * The storefront is NEVER a user choice: it is derived from the request
 * itself, so affiliate links always point at the storefront the visitor is
 * most likely to buy from (and whose Associates tag actually tracks).
 *
 * Priority:
 *   1. Country header from the edge (CDN / native nginx geo module):
 *      CF-IPCountry, X-Geo-Country, X-Country-Code, X-Vercel-IP-Country.
 *   2. Accept-Language (browser's real preference; no UI, no cookie).
 *   3. AMAZON_DEFAULT_MARKET (fallback "de").
 *
 * NOTE: this is a *hint* resolver, not a security control. It only picks
 * between marketplaces that all have a configured Associates tag, so a
 * spoofed header can at worst pick a different (still monetized) storefront.
 */

import amazonAffiliateService from "../services/amazonAffiliateService.js";

// Storefronts served by amazon.de: EU/EEA + Switzerland (German-language
// storefront, EU-wide delivery). Everything else falls back to the global
// amazon.com storefront.
const DE_COUNTRIES = new Set([
  "DE", "AT", "CH", "LI", "LU",
  "BE", "NL", "FR", "IT", "ES", "PT", "IE", "DK", "SE", "FI", "NO", "IS",
  "PL", "CZ", "SK", "HU", "SI", "HR", "RO", "BG", "GR", "EE", "LV", "LT",
  "MT", "CY",
]);

const US_COUNTRIES = new Set([
  "US", "CA", "MX", "BR", "AR", "CL", "CO", "PE",
  "GB", "AU", "NZ", "IN", "SG", "MY", "PH", "JP", "KR", "ZA", "AE", "SA",
]);

const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-geo-country",
  "x-country-code",
  "x-vercel-ip-country",
  "x-appengine-country",
];

/**
 * @param {import("express").Request} req
 * @returns {string} market code ("de" | "us" ...) that is actually configured
 */
export function resolveMarket(req) {
  const available = amazonAffiliateService.availableMarkets();
  const fallback = (process.env.AMAZON_DEFAULT_MARKET || "de").toLowerCase();
  const pick = (candidate) =>
    candidate && available.includes(candidate) ? candidate : null;

  // 1. explicit country header (CDN or nginx geo module)
  const get = (k) => (typeof req?.get === "function" ? req.get(k) : req?.headers?.[k]);
  for (const header of COUNTRY_HEADERS) {
    const raw = get(header);
    if (!raw) continue;
    const country = String(raw).trim().toUpperCase();
    if (!country || country === "XX" || country === "T1") continue;
    if (DE_COUNTRIES.has(country)) return pick("de") || pick(fallback);
    if (US_COUNTRIES.has(country)) return pick("us") || pick("de") || pick(fallback);
    return pick(fallback);
  }

  // 2. Accept-Language — e.g. "de-DE,de;q=0.9,en-US;q=0.8" / "en-US,en;q=0.9"
  const acceptLanguage = String(get("accept-language") || "");
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0].trim();
    if (!tag) continue;
    const [lang, region] = tag.split("-");
    const l = (lang || "").toLowerCase();
    const r = (region || "").toUpperCase();

    if (r && DE_COUNTRIES.has(r)) return pick("de") || pick(fallback);
    if (r && US_COUNTRIES.has(r)) return pick("us") || pick("de") || pick(fallback);
    if (!r && l === "de") return pick("de") || pick(fallback);
    if (!r && l === "en") return pick("us") || pick("de") || pick(fallback);
  }

  // 3. configured default
  return pick(fallback) || available[0] || "de";
}

export default resolveMarket;
