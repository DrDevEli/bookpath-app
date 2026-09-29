/**
 * Catalog ranker — turn a raw Google Books result set into a list of books a
 * visitor could plausibly buy.
 *
 * WHY THIS EXISTS (audited 2026-09-27)
 * ------------------------------------
 * The SEO landing pages are populated from a keyword search against Google
 * Books. Google's relevance ordering answers a query about a phrase with works
 * that are ABOUT the phrase, so a "curated" list routinely contained:
 *
 *   - 19th-century scans: `topic/best-memoirs` was 11/12 publisherless public
 *     domain (The Gentleman's Magazine 1845, Memoirs of the Geological Survey
 *     of India 1883, Biennial Report... 1881). Google's bulk-scan programme has
 *     no publisher field, so the missing publisher + an old year IS the
 *     fingerprint of a scan dump.
 *   - Academic/vanity press: GRIN Verlag (60 volumes served), diplom.de,
 *     Springer, Routledge, Schäffer-Poeschel.
 *   - Books about books: "An Index to Science Fiction Book Reviews" (which
 *     `topic/best-sci-fi-books` genuinely served), "Library of Congress Subject
 *     Headings", "Catalogue of the Mercantile Library in New York".
 *   - Single-author flooding: `topic/cozy-mysteries` served 9 of 12 slots from
 *     one self-published author (Fiona Grace).
 *
 * Measured on the live cache (154 pages, 1848 volumes): 7.5% structural-junk
 * titles, ~35% with no publisher at all, and only 7.1% carrying a ratingsCount.
 *
 * Two consequences shaped the design:
 *
 *   1. `ratingsCount >= 5` CANNOT be a hard gate. Only 7.1% of the served
 *      volumes carry one, so gating on it would starve every list to 0-1 books.
 *      It stays a strong BONUS and a tie-breaker.
 *   2. Query rewriting is NOT the lever. Measured: `orderBy=newest` is silently
 *      ignored by the Books API (identical result set), and `subject:`-anchored
 *      queries came back WORSE than the phrase query (`subject:"History"` →
 *      Routledge textbooks + Xlibris vanity). Ranking what the API returns, and
 *      asking for more of it, is the lever we actually control.
 *
 * Everything here is a pure function over fields the existing single Google
 * Books request already returns (ratingsCount, publisher, firstPublishYear,
 * pageCount, language, isbn, coverImage) — so ranking costs ZERO extra quota.
 * The candidate pool is widened separately, by paginating (see seoBookFetcher).
 *
 * No fabricated data: a rejected book is dropped, never replaced with an
 * invention, and a list that cannot fill is allowed to come back short.
 */

/** Hard rejects: never served, under any circumstance. */
const HARD_REJECT_TITLE = new RegExp(
  [
    // Catalogues, indexes and reference works about books
    "\\bindex to\\b", "\\ban index\\b", "\\bindex of\\b", "\\bcatalogue\\b", "\\bcatalog of\\b",
    "\\bbibliograph", "\\bsubject headings\\b", "\\bsubject catalog\\b", "\\blist of works\\b",
    "\\bconcordance\\b", "\\bchecklist\\b", "\\breader'?s guide\\b", "\\blibrary journal\\b",
    // Periodicals and institutional publications
    "\\bmagazine\\b", "\\bquarterly\\b", "\\bjahrbuch\\b", "\\bproceedings\\b",
    "\\btransactions of\\b", "\\bannual report\\b", "\\bbiennial report\\b", "\\bbulletin\\b",
    "\\bjournal\\b", "\\babstracts\\b", "\\balmanac\\b", "\\bdirectory\\b", "\\bwho'?s who\\b",
    "\\breview of politics\\b", "\\bthe review of\\b", "\\bsaturday review\\b",
    "\\bpublishers'? weekly\\b", "\\bsale-catalogues?\\b", "\\bbook review\\b", "\\bbook digest\\b",
    // Academic apparatus and study aids
    "\\bdissertation\\b", "\\bthesis\\b", "\\bhabilitation\\b", "\\blecture notes\\b",
    "\\bworking paper\\b", "\\bstudy guide\\b", "\\bcliffsnotes\\b", "\\bsparknotes\\b",
    "\\bworkbook\\b", "\\bexam\\b", "\\btest prep\\b", "\\bfor dummies\\b",
    // Writing manuals rather than books to read
    "\\bhow to write\\b", "\\bwriting fiction\\b", "\\bwrite a novel\\b", "\\bscreenwriting\\b",
    "\\bstorybuilder\\b", "\\bnovel writing\\b",
    // Multi-volume reference sets
    "\\bencyclop[ae]dia\\b", "\\bdictionary of\\b", "\\bhandbook of\\b", "\\bcompanion to\\b",
    "\\bcollected works\\b", "\\bcomplete works of\\b", "\\bselected works\\b",
  ].join("|"),
  "i"
);

// NOTE: "Band 7" / "Volume 2" / "Vol. 1" are deliberately NOT junk patterns. They
// were tried and produced a false positive on legitimate series volumes — German
// fiction uses "Band N" for a series entry, and English boxed sets use "Volume N".
// The multi-volume SCAN problem they were meant to catch is already covered by the
// scan fingerprint below (no publisher + pre-1960), which is the real signal.


/** Publisher-side hard rejects: vanity press, publish-on-demand and scan farms.
 *  None of these produce a trade book a reader would buy on Amazon. */
const HARD_REJECT_PUBLISHER = new RegExp(
  [
    "grin verlag", "grin publishing", "\\bgrin\\b", "diplomica", "diplom\\.de",
    "books on demand", "\\bbod\\b", "\\buksak\\b", "xlibris", "author ?house",
    "iuniverse", "trafford", "outskirts", "createspace", "\\blulu\\b",
    "e-artnow", "forgotten books", "legare street", "theclassics", "nabu press",
    "andesite press", "sagwan press", "wentworth press", "bibliolife", "palala press",
    "kessinger", "read books ltd", "1st world publishing", "alpha editions?",
    "wildside press", "scholar'?s press", "scholarly title", "lap lambert", "vdm verlag",
    "anchor academic", "bachelor \\+ master", "bookrix", "dokumente verlag",
  ].join("|"),
  "i"
);

/** Academic publishers are NOT junk — a Springer title belongs on a Tech list —
 *  but they are not what a "best books" landing page should lead with, so they
 *  take a ranking penalty instead of a rejection. */
const ACADEMIC_PUBLISHER = new RegExp(
  [
    "springer", "routledge", "palgrave", "\\bbrill\\b", "de gruyter", "university press",
    "universitatsverlag", "psychology press", "crc press", "mcgraw-hill", "pearson",
    "cengage", "wiley", "sch[aä]ffer-poeschel", "kohlhammer", "mc?farland",
    "\\boxbow\\b", "academic press", "elsevier", "mit press", "johns hopkins",
    "oxford university", "cambridge university", "polity press", "sage publications",
  ].join("|"),
  "i"
);

/** Real trade houses (and Amazon's own digital-first imprints). A recognised
 *  publisher is the strongest available evidence that a volume is a book people
 *  read — and the strongest predictor of an actual Amazon purchase. */
const TRADE_PUBLISHER = new RegExp(
  [
    "penguin", "random house", "harpercollins", "harper collins", "\\bharper\\b",
    "simon ?&? ?and ?schuster", "hachette", "bloomsbury", "macmillan", "pan macmillan",
    "little,? brown", "doubleday", "vintage", "\\bfaber\\b", "granta", "w\\.? ?w\\.? norton",
    "st\\.? martin'?s", "\\btor\\b", "del rey", "orbit", "gollancz", "hodder", "headline",
    "avon", "berkley", "bantam", "ballantine", "scribner", "atria", "free press",
    "pocket books", "grand central", "kensington", "sourcebooks", "harlequin", "mills ?& ?boon",
    "\\bzebra\\b", "workman", "dorling kindersley", "\\bdk\\b", "national geographic",
    "quarto", "chronicle books", "ten speed", "portfolio", "\\bcrown\\b", "currency",
    "broadway", "harmony", "harperbusiness", "harperone", "harper perennial", "ecco",
    "heyne", "deutscher taschenbuch", "\\bdtv\\b", "fischer", "rowohlt", "\\bpiper\\b",
    "klett-cotta", "suhrkamp", "ullstein", "goldmann", "bastei", "dumont", "hanser",
    "campus verlag", "redline", "finanzbuch", "\\becon\\b", "beck", "scherz", "blanvalet",
    "oreilly", "o'reilly", "apress", "no starch", "packt", "manning", "pragmatic",
    "thomas & mercer", "lake union", "montlake", "47north", "brilliance", "amazoncrossing",
    // Added 2026-09-29 — trade imprints that were being treated as no-name
    // publishers while independent/quotation-grade houses scored above them.
    "picador", "virago", "secker", "jonathan cape", "farrar", "straus", "\\bgiroux\\b",
    "henry holt", "riverhead", "\\bputnam\\b", "\\bgrove\\b", "atlantic monthly",
    "graywolf", "houghton mifflin", "mariner books", "back bay", "anchor books",
    "\\bcanongate\\b", "\\bserpent'?s tail\\b", "\\bsoho press\\b", "\\bceladon\\b",
    "\\briverrun\\b", "\\bdial press\\b", "\\beuropa editions\\b", "\\bharvill\\b",
    "\\b4th estate\\b", "\\bfourth estate\\b", "\\btinder press\\b", "\\bpamela dorman\\b",
    "\\bblack swan\\b", "\\bcornerstone\\b", "\\bwindmill books\\b",
    // Canon imprints that ARE the product on the classics pages (Dover Thrift,
    // Wordsworth, Signet and Bantam Classics are what a buyer searches for).
    "\\bdover\\b", "courier dover", "wordsworth editions", "\\bsignet\\b", "bantam classics",
  ].join("|"),
  "i"
);

/**
 * Categories that mean "a book ABOUT books" rather than a book to read.
 *
 * Measured on the live cache 2026-09-29 (1,592 volumes, 87.6% carrying a BISAC
 * `categories` array — free metadata the ranker previously ignored): every
 * off-topic survivor on the eight broken pages carried one of these as its ONLY
 * category, e.g. `Critical Terms for Science Fiction and Fantasy` (Literary
 * Criticism) on genre/science-fiction, `The Digital Reader` (Education) on
 * topic/classic-literature, `Research Methods for Business Students` (Business
 * & Economics is NOT here — it is the page's own domain) — see the note below.
 *
 * What it is not: a way to catch a book that is *about* the page's subject but
 * legitimately categorized inside it (`The 100 Best Business Books of All Time`
 * is Business & Economics). That class is a QUERY problem, fixed in the catalog.
 */
const OFF_TOPIC_CATEGORY = new RegExp(
  [
    "literary criticism", "\\breference\\b", "language arts & disciplines",
    "study aids", "\\beducation\\b", "bibliograph", "library science",
    "\\bbooks\\b", "antiques & collectibles", "publishing", "journalism",
  ].join("|"),
  "i"
);

/**
 * Page category -> the BISAC category a real book in that section carries.
 * A match is worth CATEGORY_BONUS: it is the cheapest available proof that the
 * volume belongs on THIS page rather than merely mentioning its topic.
 * Keys are lowercased `entry.category` values from seoCatalog.js.
 */
const CATEGORY_MATCH = {
  fiction: /^(fiction|juvenile fiction|young adult fiction)/i,
  "non-fiction": /^(?!fiction)/i, // everything that is not fiction — deliberately permissive
  "sci-fi": /^(science fiction|fiction|juvenile fiction)/i,
  fantasy: /^(fantasy|fiction|juvenile fiction)/i,
  mystery: /^(mystery|detective|fiction|thriller)/i,
  romance: /^(romance|fiction)/i,
  history: /^history/i,
  biography: /^(biography|autobiography)/i,
  "self-help": /^(self-help|self help|body, mind)/i,
  business: /^business/i,
  tech: /^(computers|technology|computers & internet)/i,
};
const CATEGORY_BONUS = 5;

/** A Google bulk-scan dump has no publisher and an old (or absent) year. This is
 *  the single highest-yield filter: it removes the entire `best-memoirs`
 *  / `best-history-books` class of 19th-century periodical scans. */
const SCAN_MAX_YEAR = 1960;

// Bounds wide enough for a picture book (children's lists) and for a doorstop
// (a 900-page history): only pamphlets and reference tomes are rejected here.
// The old 70-page floor was itself deleting legitimate children's titles — the
// `topic/buecher-fuer-kinder` list lost 5 of 12 volumes to it.
const MIN_PAGES = 24;
const MAX_PAGES = 1600;

/**
 * Language handling. A landing page declares a language and showing German-only
 * titles on an English page is the bug `topic/cozy-mysteries` shipped with — so
 * for genre/topic pages the language is a hard constraint (relaxable only to
 * avoid an empty shelf).
 *
 * AUTHOR pages are different: `inauthor:"John Grisham"` returns his German
 * translations first, and rejecting those emptied the page (all 12 rejected).
 * On an author page the subject is the author, so a mismatch is a PREFERENCE
 * (+LANG_BONUS), never a reject — see the `strictLanguage` option.
 */
const LANG_BONUS = 3;

/**
 * Structural junk in the title. Exported for tests.
 * @returns {string|null} the matched pattern (a reject reason) or null
 */
export function titleRejectReason(book) {
  const title = `${book?.title || ""} ${book?.subtitle || ""}`;
  if (!title.trim()) return "no-title";
  const m = title.match(HARD_REJECT_TITLE);
  return m ? `junk-title:${m[0].toLowerCase().trim()}` : null;
}

export function publisherRejectReason(book) {
  const pub = book?.publisher || "";
  if (!pub) return null; // handled by the scan heuristic, which needs the year too
  const m = pub.match(HARD_REJECT_PUBLISHER);
  return m ? `junk-publisher:${m[0].toLowerCase()}` : null;
}

/** Categories (BISAC strings Google returns in `volumeInfo.categories`) that
 *  carry no value on any BookPath page. Silently absent categories are NOT a
 *  reason: 12.4% of served volumes carry none, and rejecting those would starve
 *  whole lists (same reasoning as the ratingsCount gate that was measured and
 *  rejected). Only a volume whose EVERY category is off-topic is dropped. */
export function categoryRejectReason(book, entry = {}, opts = {}) {
  // An AUTHOR page is about a person, not a section: "How to Become a Straight-A
  // Student" (Study Aids) is a real Cal Newport book and belongs on his page.
  if (opts.isAuthorPage) return null;
  const cats = (Array.isArray(book?.genres) ? book.genres : []).filter(Boolean).map(String);
  if (cats.length === 0) return null;
  // Google labels ebooks "Electronic books"; that says nothing about the content.
  if (cats.some((c) => /^electronic books?$/i.test(c))) return null;
  // A page whose own subject IS one of these (none today, but the catalog is
  // data) must not reject its own domain.
  const pageCat = String(entry.category || "").toLowerCase();
  if (pageCat && OFF_TOPIC_CATEGORY.test(pageCat)) return null;
  if (!cats.every((c) => OFF_TOPIC_CATEGORY.test(c))) return null;
  return `off-topic-category:${cats[0].toLowerCase()}`;
}

/** Bonus when the volume's own BISAC category matches the page's section. */
export function categoryMatchBonus(book, entry = {}) {
  const want = CATEGORY_MATCH[String(entry?.category || "").toLowerCase()];
  if (!want) return 0;
  const cats = Array.isArray(book?.genres) ? book.genres : [];
  return cats.some((c) => want.test(String(c))) ? CATEGORY_BONUS : 0;
}

/**
 * Hard reject, in priority order. Returns a short reason string or null.
 * `entry.lang` ("en" | "de") is the landing page's language; a page in English
 * showing German-only titles is the bug `topic/cozy-mysteries` shipped with, so
 * a language mismatch is a reject — but a *recoverable* one (see rankBooks).
 */
export function rejectReason(book, entry = {}, opts = {}) {
  const { strictLanguage = true } = opts;
  if (!book) return "missing";
  if (!book.id) return "no-id";
  // A card with no cover renders as a broken box; Google returns no imageLinks
  // for a good fraction of scan dumps anyway.
  if (!book.coverImage) return "no-cover";

  const t = titleRejectReason(book);
  if (t) return t;

  const p = publisherRejectReason(book);
  if (p) return p;

  // "A book about books" — see OFF_TOPIC_CATEGORY. Sits with the title and
  // publisher rules because it is structural, not a matter of taste.
  const c = categoryRejectReason(book, entry, opts);
  if (c) return c;

  const pages = Number(book.pageCount) || 0;
  if (pages && (pages < MIN_PAGES || pages > MAX_PAGES)) return "page-count";

  // No imprint AND no ISBN. Measured on the live cache: 27.2% of served volumes
  // had neither, and every sample past the pre-1960 scans was still junk that the
  // year heuristic alone missed — Time, The Economist, New York Magazine, "Best
  // Books", "ACM Administrative Directory", "Library of Congress Subject
  // Headings". A real, buyable book carries one or the other; a scan dump, a
  // magazine issue or an institutional directory carries neither.
  if (!book.publisher && !book.isbn) return "no-imprint";

  // The year rule, kept as a second net. It is gated on the ISBN because Google's
  // scan records DO often carry the ORIGINAL publisher ("New York : E. P. Dutton",
  // 1976), so publisher alone does not prove a modern edition — but any edition a
  // reader can actually buy today carries an ISBN. This is what keeps a 1898
  // Macmillan scan of a classic off the shelf while a Penguin Classics edition of
  // the same text (ISBN, modern publisher) still ranks.
  const year = Number(book.firstPublishYear) || 0;
  if (!book.isbn && year && year < SCAN_MAX_YEAR) return "pre-1960-scan";

  if (strictLanguage && entry.lang) {
    const lang = String(book.language || "").toLowerCase();
    if (!lang) return "no-language";
    if (!lang.startsWith(entry.lang)) return "language";
  }
  return null;
}

/** Reasons that may be relaxed to keep a page full, worst-case only. A language
 *  mismatch beats an empty list; structural junk never does. */
const SOFT_REASONS = new Set(["language"]);

/**
 * Score a book that passed the hard filters. Higher is better. Every signal here
 * is free — it is already in the payload of the request that produced the book.
 */
export function scoreBook(book, entry = {}) {
  let score = 0;

  const rc = Number(book.ratingsCount) || 0;
  const ar = Number(book.averageRating) || 0;
  // Reader ratings only exist for books people actually read. Sparse in Google
  // Books (7.1% of the served set) — hence a bonus, never a gate. Raised
  // 2026-09-29 (was 2 + min(8, ·)): on the eight broken pages the ONLY clear
  // winners in every probe were the volumes carrying ratingsCount, so the one
  // honest "people read this" signal available should dominate the tie-breaks.
  if (rc > 0) score += 3 + Math.min(12, Math.log10(rc + 1) * 5);
  if (ar >= 4.2) score += 3;
  else if (ar >= 3.8) score += 2;
  else if (ar >= 3.4) score += 1;

  // Does the volume's own category match the page's section?
  score += categoryMatchBonus(book, entry);

  const pub = book.publisher || "";
  if (pub && TRADE_PUBLISHER.test(pub)) score += 6;
  if (pub && ACADEMIC_PUBLISHER.test(pub)) score -= 4;
  if (pub && /independently published|self-?published/i.test(pub)) score -= 4;

  // A real ISBN means a modern, trade-distributed book (§ the scan dumps rarely
  // carry one).
  if (book.isbn) score += 2;

  // Purchasable on Amazon = the whole point of the page.
  if (book.saleability === "FOR_SALE" || book.saleability === "FOR_PREORDER") score += 2;

  const year = Number(book.firstPublishYear) || 0;
  if (year >= 2010) score += 2;
  else if (year >= 1990) score += 1;
  else if (year && year < 1970) score -= 3;

  const desc = book.description || "";
  if (desc.length >= 140 && desc.length <= 1200) score += 1;
  // A 1200-char academic abstract is not a marketing blurb.
  if (desc.length > 1600) score -= 2;

  if (book.pageCount && book.pageCount >= 120 && book.pageCount <= 900) score += 1;

  return score;
}

function authorKey(book) {
  const a = (book.authors || book.authorNames || [])[0];
  return String(a || "").trim().toLowerCase();
}

function dedupeKey(book) {
  const a = authorKey(book);
  const t = String(book.title || "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${t}|${a}`;
}

/**
 * Rank a candidate set into the books to serve.
 *
 * @param {Array}  books            candidate volumes (any size — the caller widens
 *                                  the pool by paginating)
 * @param {object} [opts]
 * @param {object} [opts.entry]     catalog entry (uses `lang`)
 * @param {number} [opts.limit]     how many to return (the page's card count)
 * @param {number} [opts.maxPerAuthor] diversity cap — stops one prolific
 *                                  self-publisher owning a whole list
 * @returns {{selected: Array, stats: object}}
 */
export function rankBooks(books, opts = {}) {
  const { entry = {}, limit = 12, maxPerAuthor = 2, strictLanguage = true, isAuthorPage = false } = opts;
  const stats = {
    considered: books.length,
    rejected: {},
    passed: 0,
    selected: 0,
    relaxedLanguage: 0,
    droppedForAuthorCap: 0,
    droppedAsDuplicate: 0,
  };

  const primary = [];
  const relaxed = [];
  const seen = new Set();

  const score = (book) => {
    let s = scoreBook(book, entry);
    // On an author page a language mismatch is allowed but still disfavoured.
    if (!strictLanguage && entry.lang && String(book.language || "").startsWith(entry.lang)) {
      s += LANG_BONUS;
    }
    return s;
  };

  for (const book of books || []) {
    const reason = rejectReason(book, entry, { strictLanguage, isAuthorPage });
    if (reason) {
      stats.rejected[reason] = (stats.rejected[reason] || 0) + 1;
      if (SOFT_REASONS.has(reason)) relaxed.push({ book, score: score(book) - 5 });
      continue;
    }
    const key = dedupeKey(book);
    if (seen.has(key)) {
      stats.droppedAsDuplicate++;
      continue;
    }
    seen.add(key);
    primary.push({ book, score: score(book) });
  }
  stats.passed = primary.length;

  const byScore = (a, b) =>
    b.score - a.score ||
    (Number(b.book.ratingsCount) || 0) - (Number(a.book.ratingsCount) || 0) ||
    (Number(b.book.firstPublishYear) || 0) - (Number(a.book.firstPublishYear) || 0) ||
    String(a.book.title || "").localeCompare(String(b.book.title || ""));

  primary.sort(byScore);
  relaxed.sort(byScore);

  const selected = [];
  const perAuthor = new Map();

  const take = (candidates, { relaxedPass = false } = {}) => {
    for (const c of candidates) {
      if (selected.length >= limit) return;
      const key = authorKey(c.book);
      const used = perAuthor.get(key) || 0;
      if (key && used >= maxPerAuthor) {
        stats.droppedForAuthorCap++;
        continue;
      }
      if (selected.some((s) => s.id === c.book.id)) continue;
      if (key) perAuthor.set(key, used + 1);
      if (relaxedPass) stats.relaxedLanguage++;
      selected.push(c.book);
    }
  };

  take(primary);
  // Fill the remainder only from reversibly-rejected books (language mismatch),
  // so a page degrades to "some titles in another language" rather than to an
  // empty shelf. Structural junk is never resurrected.
  if (selected.length < limit) take(relaxed, { relaxedPass: true });

  stats.selected = selected.length;
  return { selected, stats };
}

export const DEFAULT_LIMIT = 12;

/**
 * The selection options a given catalog page needs. Exported so the fetcher, the
 * offline evaluator and any future caller cannot drift apart on these rules —
 * both of them were derived from a measured failure, not a preference.
 *
 * @param {object} entry  catalog entry (uses `lang`)
 * @param {string} type   "genre" | "topic" | "author"
 * @param {number} [limit]
 */
export function selectionOptionsFor(entry, type, limit = DEFAULT_LIMIT) {
  const isAuthorPage = type === "author";
  return {
    entry,
    limit,
    isAuthorPage,
    // An author page IS one author, so the diversity cap would truncate it to 2
    // books (measured on `author/john-grisham`). The cap exists to stop one
    // prolific self-publisher owning a whole TOPIC list (`topic/cozy-mysteries`
    // served 9 of 12 slots from a single author).
    maxPerAuthor: isAuthorPage ? limit : 2,
    // `inauthor:` returns an author's translated editions first, so requiring
    // the page's language emptied `author/john-grisham` (12/12 rejected as
    // German). On an author page language is a preference, not a requirement.
    strictLanguage: !isAuthorPage,
  };
}

export default { rankBooks, scoreBook, rejectReason, categoryRejectReason, categoryMatchBonus, selectionOptionsFor, DEFAULT_LIMIT };