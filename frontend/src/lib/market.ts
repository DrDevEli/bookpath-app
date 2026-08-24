// Market selection for Amazon affiliate links.
// Persisted per-visitor so the chosen storefront survives navigation.
export const MARKET_KEY = 'bookpath_market';
export type Market = 'de' | 'us';

export const getMarket = (): Market =>
  localStorage.getItem(MARKET_KEY) === 'us' ? 'us' : 'de';

export const setMarket = (m: Market) => {
  localStorage.setItem(MARKET_KEY, m);
};

export const MARKET_LABELS: Record<Market, { flag: string; label: string }> = {
  de: { flag: '🇩🇪', label: 'Amazon.de' },
  us: { flag: '🇺🇸', label: 'Amazon.com' },
};
