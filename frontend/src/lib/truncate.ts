/**
 * Truncate a long book description (Google Books synopses are often several
 * paragraphs) down to a few sentences for card / detail display.
 *
 * Also strips stray HTML tags and decodes entities as defense-in-depth — the
 * backend already cleans descriptions at the source, but stored/legacy data
 * (library/collection books) may still contain markup.
 *
 * @param text    raw description
 * @param maxLen  hard character cap (default 200 ≈ 2–3 sentences)
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '\u2013', mdash: '\u2014', hellip: '\u2026',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D',
  copy: '\u00A9', reg: '\u00AE', trade: '\u2122', bull: '\u2022',
};

function decodeHtmlEntities(str: string): string {
  return str.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

export function truncateDescription(text?: string | null, maxLen = 200): string {
  if (!text) return '';
  const cleaned = decodeHtmlEntities(text.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
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
