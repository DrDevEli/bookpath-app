/**
 * Truncate a long book description (Google Books synopses are often several
 * paragraphs) down to a few sentences for card / detail display.
 *
 * @param text    raw description
 * @param maxLen  hard character cap (default 200 ≈ 2–3 sentences)
 */
export function truncateDescription(text?: string | null, maxLen = 200): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;

  const window = cleaned.slice(0, maxLen);
  const lastSentence = Math.max(
    window.lastIndexOf('.'),
    window.lastIndexOf('!'),
    window.lastIndexOf('?')
  );
  // Prefer a sentence boundary; fall back to a word boundary.
  const cut = lastSentence > 40 ? lastSentence + 1 : window.lastIndexOf(' ');
  const end = cut > 0 ? cut : maxLen;
  return cleaned.slice(0, end).trim() + '…';
}
