/**
 * Truncate a long book description down to a concise summary.
 *
 * Cuts ONLY at complete-sentence boundaries (never mid-sentence) and does not
 * append an ellipsis — so the result reads as a short, complete blurb rather
 * than a chopped fragment. Also strips stray HTML tags and decodes entities as
 * defense-in-depth (the backend already cleans at the source).
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

  // Cut at the last complete-sentence boundary within the cap — never mid-sentence.
  const window = cleaned.slice(0, maxLen);
  const lastBoundary = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? ')
  );
  if (lastBoundary > 0) {
    return cleaned.slice(0, lastBoundary + 1).trim();
  }

  // No sentence break inside the window — fall back to a whole-word cut.
  const lastSpace = window.lastIndexOf(' ');
  return cleaned.slice(0, lastSpace > 0 ? lastSpace : maxLen).trim();
}
