import {
  SITE_URL,
  SITE_NAME,
  GENRES,
  TOPICS,
  AUTHORS,
  GENRE_BY_SLUG,
  TOPIC_BY_SLUG,
  AUTHOR_BY_SLUG,
} from "../data/seoCatalog.js";

/**
 * Server-side SEO landing-page renderer.
 *
 * Produces a complete, crawlable HTML document (no client JS required) so that
 * Google/Bing and other crawlers index BookPath's programmatic pages with full
 * meta tags, schema.org structured data, and a real book list. The React SPA
 * handles the interactive app; these pages handle distribution.
 */

// ---------------------------------------------------------------------------
// HTML / JSON-LD escaping (XSS-safe: all book data comes from Google Books)
// ---------------------------------------------------------------------------
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJson(value) {
  // JSON.stringify already escapes quotes/backslashes; additionally neutralize
  // </script> so a malicious title can't break out of the JSON-LD script tag.
  return JSON.stringify(value ?? null).replace(/</g, "\\u003c");
}

// Google Books image URLs come back as http:// — an https page loading them is
// mixed content (blocked or auto-upgraded by browsers, rejected by social
// scrapers). New fetches are normalized upstream, but cached payloads can still
// hold http URLs, so normalize again at render time.
function httpsify(url) {
  return url ? String(url).replace(/^http:\/\//i, "https://") : url;
}

// Deterministic pseudo-hash (djb2) so each page's copy is stable + unique.
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------
function pageUrl(type, slug) {
  return `${SITE_URL}/${type === "genre" ? "books/genre" : type === "topic" ? "books/topic" : "books/author"}/${encodeURIComponent(slug)}`;
}

function bookDetailUrl(id) {
  if (!id) return `${SITE_URL}/search`;
  return `${SITE_URL}/books/${encodeURIComponent(id)}`;
}

function categoryUrl(category) {
  return `${SITE_URL}/books/genre/${encodeURIComponent(slugify(category))}`;
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function currencySymbol(code) {
  if (code === "USD") return "$";
  if (code === "EUR") return "€";
  if (code === "GBP") return "£";
  return code ? `${code} ` : "";
}

// ---------------------------------------------------------------------------
// Unique intro/outro copy (EN + DE) — templated + rotated by slug hash to avoid
// thin/duplicate content across the catalog.
// ---------------------------------------------------------------------------
const EN_INTROS = [
  (n, c) => `Looking for ${n.toLowerCase()}? This curated list brings together the standout ${c.toLowerCase()} titles readers keep returning to, so you can skip the noise and find your next read faster.`,
  (n, c) => `If ${n.toLowerCase()} is on your reading list, you're in the right place. We've pulled together a focused selection of ${c.toLowerCase()} books — from enduring classics to the titles everyone is talking about right now.`,
  (n, c) => `Here's a hand-picked roundup of ${n.toLowerCase()}. Every entry below is a ${c.toLowerCase()} title worth your time, chosen for lasting impact and reader ratings.`,
  (n, c) => `Finding great ${n.toLowerCase()} shouldn't mean scrolling for hours. This page collects the ${c.toLowerCase()} books that consistently earn their place on readers' shelves.`,
];

const EN_OUTROS = [
  (n, c) => `Whatever you pick from this ${c.toLowerCase()} list, you're in good company. Bookmark this page — we refresh these ${n.toLowerCase()} recommendations as new standout titles appear.`,
  (n, c) => `Want to go deeper? Browse our full ${c.toLowerCase()} category to explore more ${n.toLowerCase()} and build out your personal library.`,
  (n, c) => `These ${c.toLowerCase()} titles are a strong starting point, not the finish line. Keep exploring ${n.toLowerCase()} to find the books that click with you.`,
];

const DE_INTROS = [
  (n, c) => `Auf der Suche nach ${n}? Diese kuratierte Liste bündelt die besten ${c}-Titel, zu denen Leser immer wieder greifen — damit du schneller dein nächstes Buch findest.`,
  (n, c) => `Wenn ${n} auf deiner Leseliste steht, bist du hier richtig. Wir haben eine fokussierte Auswahl an ${c}-Büchern zusammengestellt — von zeitlosen Klassikern bis zu aktuellen Bestsellern.`,
  (n, c) => `Hier ist eine handverlesene Auswahl zu ${n}. Jeder Eintrag ist ein ${c}-Titel, der sich lohnt — ausgewählt nach Leserbewertungen und nachhaltiger Wirkung.`,
];

const DE_OUTROS = [
  (n, c) => `Was du aus dieser ${c}-Liste auch wählst — du bist in guter Gesellschaft. Speichere diese Seite ab: Wir aktualisieren die ${n}-Empfehlungen laufend.`,
  (n, c) => `Lust auf mehr? Stöbere in unserer vollständigen ${c}-Kategorie und entdecke weitere ${n} für deine persönliche Bibliothek.`,
];

function pick(templates, slug, offset = 0) {
  return templates[(hashString(slug) + offset) % templates.length];
}

function buildCopy(entry, type) {
  const lang = entry.lang === "de" ? "de" : "en";
  const category = entry.category || "Fiction";
  const n = entry.name;

  let intro;
  let outro;

  if (type === "author") {
    intro =
      lang === "de"
        ? `${n} gehört zu den meistgelesenen Autoren im Bereich ${category}. Auf dieser Seite findest du die wichtigsten Bücher und Reihen von ${n} — übersichtlich zusammengestellt.`
        : `${n} is one of the most-read names in ${category.toLowerCase()}. This page gathers the essential ${n} books and series in one place, so you can explore them in order or jump straight to a favorite.`;
    outro =
      lang === "de"
        ? `Entdecke weitere Autoren aus dem Bereich ${category} und baue deine Leseliste mit den Büchern von ${n} aus.`
        : `Explore more authors in ${category.toLowerCase()}, or keep building your reading list with ${n}'s most essential works.`;
  } else {
    intro = pick(lang === "de" ? DE_INTROS : EN_INTROS, entry.slug, 0)(n, category);
    outro = pick(lang === "de" ? DE_OUTROS : EN_OUTROS, entry.slug, 1)(n, category);
  }

  return { lang, category, intro, outro };
}

// ---------------------------------------------------------------------------
// Schema.org structured data
// ---------------------------------------------------------------------------
function breadcrumbJson(entry, type) {
  const lang = entry.lang === "de" ? "de" : "en";
  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: type === "genre" ? "Genres" : type === "topic" ? "Topics" : "Authors",
      item: `${SITE_URL}/seo`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: entry.name,
      item: pageUrl(type, entry.slug),
    },
  ];
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
}

function itemListJson(books, entry, type) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: entry.name,
    url: pageUrl(type, entry.slug),
    numberOfItems: books.length,
    itemListElement: books.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.title,
      url: bookDetailUrl(b.id),
    })),
  };
}

function booksJson(books, entry, type) {
  return {
    "@context": "https://schema.org",
    "@graph": books.slice(0, 20).map((b) => ({
      "@type": "Book",
      name: b.title,
      author: (b.authors || []).map((a) => ({ "@type": "Person", name: a })),
      image: b.coverImage ? httpsify(b.coverImage) : undefined,
      isbn: b.isbn || undefined,
      datePublished: b.firstPublishYear ? String(b.firstPublishYear) : undefined,
      url: bookDetailUrl(b.id),
      publisher: b.publisher ? { "@type": "Organization", name: b.publisher } : undefined,
      about: entry.name,
      inLanguage: b.language || (entry.lang === "de" ? "de" : "en"),
    })),
  };
}

function faqJson(entry, type, lang, market = "de") {
  const store = market === "us" ? "Amazon.com" : "Amazon.de";
  const q1 =
    lang === "de"
      ? `Welche ${entry.name} lohnen sich am meisten?`
      : `What are the best ${entry.name.toLowerCase()} to read?`;
  const a1 =
    lang === "de"
      ? `Unsere kuratierte Auswahl zu ${entry.name} bündelt hoch bewertete Titel aus dem Bereich ${entry.category} — ein guter Einstieg für Leser, die Qualität vor Quantität stellen.`
      : `Our curated ${entry.name.toLowerCase()} selection highlights highly rated ${entry.category.toLowerCase()} titles — a strong starting point for readers who value quality over quantity.`;
  const q2 =
    lang === "de"
      ? `Wie oft wird diese Liste aktualisiert?`
      : `How often is this list updated?`;
  const a2 =
    lang === "de"
      ? `Wir prüfen diese ${entry.name}-Empfehlungen regelmäßig und ergänzen neue, vielversprechende Titel.`
      : `We review these ${entry.name.toLowerCase()} recommendations regularly and add promising new titles as they emerge.`;
  const q3 =
    lang === "de"
      ? `Wo kann ich diese Bücher kaufen?`
      : `Where can I buy these books?`;
  const a3 =
    lang === "de"
      ? `Jeder Eintrag verlinkt direkt zu einer Suche auf ${store}, damit du den Titel schnell und bequem bestellen kannst.`
      : `Each entry links directly to an ${store} search so you can order the title quickly and easily.`;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: q1, acceptedAnswer: { "@type": "Answer", text: a1 } },
      { "@type": "Question", name: q2, acceptedAnswer: { "@type": "Answer", text: a2 } },
      { "@type": "Question", name: q3, acceptedAnswer: { "@type": "Answer", text: a3 } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Related pages (internal linking)
// ---------------------------------------------------------------------------
function relatedPages(entry, type, limit = 8) {
  const pool =
    type === "genre"
      ? [...GENRES, ...TOPICS, ...AUTHORS]
      : type === "topic"
        ? [...TOPICS, ...GENRES, ...AUTHORS]
        : [...AUTHORS, ...GENRES, ...TOPICS];

  const sameCategory = pool.filter(
    (e) => e !== entry && e.category === entry.category && e.lang === entry.lang
  );
  const others = pool.filter((e) => e !== entry && !(e.category === entry.category && e.lang === entry.lang));

  const related = [...sameCategory, ...others].slice(0, limit);
  return related.map((e) => {
    const t = GENRE_BY_SLUG[e.slug] ? "genre" : TOPIC_BY_SLUG[e.slug] ? "topic" : "author";
    return { type: t, slug: e.slug, name: e.name };
  });
}

// ---------------------------------------------------------------------------
// Book card HTML
// ---------------------------------------------------------------------------
function bookCardHtml(book) {
  const cover = book.coverImage ? escapeHtml(httpsify(book.coverImage)) : "";
  const title = escapeHtml(book.title);
  const authors = (book.authors || []).map(escapeHtml).join(", ");
  const desc = book.description ? escapeHtml(book.description).slice(0, 240) : "";
  const year = book.firstPublishYear ? escapeHtml(book.firstPublishYear) : "";

  const link = book.amazonLink
    ? `<a class="amz" href="${escapeHtml(book.amazonLink)}" rel="nofollow sponsored noopener noreferrer" target="_blank">Check price on Amazon →</a>`
    : `<a class="detail" href="${bookDetailUrl(book.id)}">View details</a>`;

  // Real list price from Google Books saleInfo (present only for some books).
  const price =
    book.price != null
      ? `<p class="bprice">${currencySymbol(book.currencyCode)}${Number(book.price).toFixed(2)} <span>list price</span></p>`
      : "";

  return `
      <article class="book">
        <div class="cover">${cover ? `<img src="${cover}" alt="${title} cover" loading="lazy" width="128" height="192">` : `<div class="nophoto">No cover</div>`}</div>
        <div class="meta">
          <h2 class="btitle"><a href="${bookDetailUrl(book.id)}">${title}</a></h2>
          ${authors ? `<p class="bauthor">by ${authors}</p>` : ""}
          ${year ? `<p class="byear">${year}</p>` : ""}
          ${desc ? `<p class="bdesc">${desc}…</p>` : ""}
          ${price}
          ${link}
        </div>
      </article>`;
}

// ---------------------------------------------------------------------------
// Full document render
// ---------------------------------------------------------------------------
export function renderLandingPage({ type, entry, books = [], market = "de" }) {
  const { lang, category, intro, outro } = buildCopy(entry, type);
  const title = `${entry.name}${lang === "de" ? " — Empfehlungen & Bestseller" : " — Recommendations & Bestsellers"} | ${SITE_NAME}`;
  const desc =
    lang === "de"
      ? `${entry.name}: Entdecke die besten ${category}-Bücher mit Bewertungen und direkten Kauf-Links. Kuratiert von ${SITE_NAME}.`
      : `Discover the best ${entry.name.toLowerCase()} — curated ${category.toLowerCase()} books with ratings and direct buy links. Brought to you by ${SITE_NAME}.`;

  const canonical = pageUrl(type, entry.slug);
  const related = relatedPages(entry, type);
  const booksHtml = books.map(bookCardHtml).join("");
  const year = new Date().getFullYear();

  const structured = [
    breadcrumbJson(entry, type),
    itemListJson(books, entry, type),
    booksJson(books, entry, type),
    faqJson(entry, type, lang, market),
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  const relatedHtml = related
    .map((r) => `<a href="${pageUrl(r.type, r.slug)}">${escapeHtml(r.name)}</a>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <style>
    :root { --bg:#f8fafc; --fg:#1e293b; --muted:#64748b; --brand:#3b82f6; --card:#ffffff; --line:#e2e8f0; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:var(--bg); color:var(--fg); line-height:1.6; }
    header.site { background:var(--brand); color:#fff; padding:14px 20px; }
    header.site .wrap { max-width:1080px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; }
    header.site a { color:#fff; text-decoration:none; font-weight:600; }
    header.site .brand { font-size:1.3rem; }
    nav a { margin-left:14px; opacity:.92; }
    main { max-width:1080px; margin:0 auto; padding:28px 20px 60px; }
    h1 { font-size:1.9rem; margin:0 0 6px; line-height:1.25; }
    .crumbs { font-size:.85rem; color:var(--muted); margin-bottom:14px; }
    .crumbs a { color:var(--muted); }
    .intro { font-size:1.05rem; color:#334155; max-width:760px; margin:0 0 26px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:18px; }
    .book { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px; display:flex; gap:14px; }
    .cover { flex:0 0 128px; }
    .cover img { width:128px; height:192px; object-fit:cover; border-radius:6px; background:#eef2f7; }
    .cover .nophoto { width:128px; height:192px; border-radius:6px; background:#eef2f7; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:.8rem; }
    .btitle { font-size:1.02rem; margin:0 0 4px; line-height:1.3; }
    .btitle a { color:var(--fg); text-decoration:none; }
    .btitle a:hover { color:var(--brand); }
    .bauthor, .byear { margin:0 0 4px; color:var(--muted); font-size:.88rem; }
    .bdesc { margin:0 0 10px; font-size:.86rem; color:#475569; }
    .bprice { margin:0 0 8px; font-size:.95rem; font-weight:700; color:#15803d; }
    .bprice span { font-weight:400; font-size:.78rem; color:var(--muted); }
    a.amz, a.detail { display:inline-block; font-weight:600; text-decoration:none; }
    a.amz { color:#b45309; }
    a.detail { color:var(--brand); }
    .outro { margin-top:30px; font-size:.98rem; color:#334155; max-width:760px; }
    .related { margin-top:28px; border-top:1px solid var(--line); padding-top:20px; }
    .related h2 { font-size:1.05rem; margin:0 0 10px; }
    .related a { display:inline-block; margin:0 12px 8px 0; color:var(--brand); text-decoration:none; font-size:.92rem; }
    .related a:hover { text-decoration:underline; }
    footer { max-width:1080px; margin:0 auto; padding:20px; color:var(--muted); font-size:.85rem; border-top:1px solid var(--line); }
    footer a { color:var(--muted); }
    @media (max-width:520px) { .book { flex-direction:column; } .cover { flex:0 0 auto; } .cover img, .cover .nophoto { width:100%; height:auto; max-height:260px; } }
  </style>
  <script type="application/ld+json">${escapeJson(structured)}</script>
</head>
<body>
  <header class="site">
    <div class="wrap">
      <a class="brand" href="${SITE_URL}/">${SITE_NAME}</a>
      <nav>
        <a href="${SITE_URL}/search">Search</a>
        <a href="${SITE_URL}/category">Genres</a>
        <a href="${SITE_URL}/seo">Browse</a>
      </nav>
    </div>
  </header>
  <main>
    <nav class="crumbs"><a href="${SITE_URL}/">Home</a> › <a href="${SITE_URL}/seo">Browse</a> › ${escapeHtml(entry.name)}</nav>
    <h1>${escapeHtml(entry.name)}</h1>
    <p class="intro">${intro}</p>
    <div class="grid">${booksHtml || '<p>Loading fresh recommendations — check back shortly.</p>'}</div>
    <p class="outro">${outro}</p>
    <section class="related">
      <h2>${lang === "de" ? "Weitere Empfehlungen" : "More recommendations"}</h2>
      ${relatedHtml}
    </section>
  </main>
  <footer>
    © ${year} ${SITE_NAME}. Some links are affiliate links and may earn us a commission. <a href="${SITE_URL}/sitemap.xml">Sitemap</a>
  </footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// SEO hub page (internal-linking hub listing every landing page)
// ---------------------------------------------------------------------------
export function renderHub() {
  const section = (title, list) => {
    const links = list
      .map((e) => {
        const t = GENRE_BY_SLUG[e.slug] ? "genre" : TOPIC_BY_SLUG[e.slug] ? "topic" : "author";
        return `<li><a href="${pageUrl(t, e.slug)}">${escapeHtml(e.name)}</a></li>`;
      })
      .join("");
    return `<h2>${title}</h2><ul>${links}</ul>`;
  };

  // JSON-LD: the hub is a CollectionPage listing every landing page. It was the
  // one server-rendered page without structured data.
  const hubStructured = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Browse Books by Genre, Topic & Author | ${SITE_NAME}`,
      url: `${SITE_URL}/seo`,
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: GENRES.length + TOPICS.length + AUTHORS.length,
        itemListElement: [...GENRES, ...TOPICS, ...AUTHORS].map((e, i) => {
          const t = GENRE_BY_SLUG[e.slug] ? "genre" : TOPIC_BY_SLUG[e.slug] ? "topic" : "author";
          return {
            "@type": "ListItem",
            position: i + 1,
            name: e.name,
            url: pageUrl(t, e.slug),
          };
        }),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Browse", item: `${SITE_URL}/seo` },
      ],
    },
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Browse Books by Genre, Topic &amp; Author | ${SITE_NAME}</title>
  <meta name="description" content="Browse curated book recommendations by genre, topic and author on ${SITE_NAME}.">
  <link rel="canonical" href="${SITE_URL}/seo">
  <meta name="robots" content="index, follow">
  <script type="application/ld+json">${escapeJson(hubStructured)}</script>
  <style>body{font-family:system-ui,sans-serif;margin:0;background:#f8fafc;color:#1e293b;line-height:1.6}header{background:#3b82f6;color:#fff;padding:14px 20px}main{max-width:1080px;margin:0 auto;padding:28px 20px}h1{font-size:1.8rem}h2{font-size:1.2rem;margin:24px 0 8px}ul{columns:3;list-style:none;padding:0}a{color:#2563eb;text-decoration:none}@media(max-width:600px){ul{columns:2}}</style>
</head>
<body>
<header><a href="${SITE_URL}/" style="color:#fff;text-decoration:none;font-weight:600">${SITE_NAME}</a></header>
<main>
  <h1>Browse Book Recommendations</h1>
  <p>Explore curated book lists by genre, topic and author.</p>
  ${section("Genres", GENRES)}
  ${section("Topics", TOPICS)}
  ${section("Authors", AUTHORS)}
</main>
</body>
</html>`;
  return html;
}

// ---------------------------------------------------------------------------
// Book detail page (server-rendered for crawlers + social preview bots)
// ---------------------------------------------------------------------------
const BOOK_STYLE = `
    :root { --bg:#f8fafc; --fg:#1e293b; --muted:#64748b; --brand:#3b82f6; --card:#ffffff; --line:#e2e8f0; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:var(--bg); color:var(--fg); line-height:1.6; }
    header.site { background:var(--brand); color:#fff; padding:14px 20px; }
    header.site .wrap { max-width:1080px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; }
    header.site a { color:#fff; text-decoration:none; font-weight:600; }
    header.site .brand { font-size:1.3rem; }
    nav a { margin-left:14px; opacity:.92; }
    main { max-width:1080px; margin:0 auto; padding:28px 20px 60px; }
    .crumbs { font-size:.85rem; color:var(--muted); margin-bottom:16px; }
    .crumbs a { color:var(--muted); }
    .head { display:flex; gap:26px; align-items:flex-start; }
    .cover { flex:0 0 200px; }
    .cover img { width:200px; height:300px; object-fit:cover; border-radius:8px; background:#eef2f7; box-shadow:0 2px 10px rgba(15,23,42,.12); }
    .cover .nophoto { width:200px; height:300px; border-radius:8px; background:#eef2f7; display:flex; align-items:center; justify-content:center; color:#94a3b8; }
    h1 { font-size:1.7rem; margin:0 0 6px; line-height:1.25; }
    .byline { color:var(--muted); margin:0 0 12px; }
    .byline a { color:var(--brand); text-decoration:none; }
    .facts { margin:0 0 16px; padding:0; list-style:none; font-size:.9rem; color:#475569; }
    .facts li { margin-bottom:4px; }
    .facts b { color:var(--fg); }
    .price { font-size:1.15rem; font-weight:700; color:#15803d; margin:0 0 12px; }
    .price span { font-weight:400; font-size:.8rem; color:var(--muted); }
    a.cta { display:inline-block; background:#b45309; color:#fff; padding:12px 22px; border-radius:8px; font-weight:600; text-decoration:none; }
    a.cta.alt { background:var(--brand); margin-left:8px; }
    section.desc { margin-top:34px; }
    section.desc h2, section.related h2 { font-size:1.1rem; margin:0 0 10px; }
    section.desc p { margin:0 0 12px; max-width:820px; color:#334155; white-space:pre-line; }
    section.related { margin-top:34px; border-top:1px solid var(--line); padding-top:22px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:16px; }
    .minibook { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px; display:flex; gap:12px; }
    .minibook img { width:64px; height:96px; object-fit:cover; border-radius:5px; background:#eef2f7; }
    .minibook .t { font-size:.92rem; font-weight:600; margin:0 0 4px; line-height:1.3; }
    .minibook .a, .minibook .y { margin:0; font-size:.82rem; color:var(--muted); }
    .minibook a { color:var(--fg); text-decoration:none; }
    footer { max-width:1080px; margin:0 auto; padding:20px; color:var(--muted); font-size:.85rem; border-top:1px solid var(--line); }
    footer a { color:var(--muted); }
    @media (max-width:640px) { .head { flex-direction:column; } .cover, .cover img, .cover .nophoto { width:100%; max-width:240px; height:auto; } }
`;

function truncateText(str, max = 155) {
  const clean = String(str || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/[\s,;:.-]+$/, "")}…`;
}

/**
 * Server-rendered book detail page. Rendered for crawlers and social/link
 * preview bots (nginx routes only those UAs here — humans keep the React app).
 * Content mirrors the app page: real title, authors, cover, description and the
 * Amazon CTA for the visitor's storefront, so it is not cloaking.
 *
 * @param {{book: object, related?: object[], market?: string}} params
 */
export function renderBookDetail({ book = {}, related = [], market = "de" }) {
  const id = book.id || "";
  const title = book.title || "Book";
  const authors = (book.authors || []).filter(Boolean);
  const authorLine = authors.length ? authors.join(", ") : "";
  const canonical = `${SITE_URL}/books/${encodeURIComponent(id)}`;
  const cover = httpsify(book.coverImage) || "";
  const desc = String(book.description || "").trim();
  const metaDesc = truncateText(
    desc || `${title}${authorLine ? ` by ${authorLine}` : ""} — book details, cover and where to buy.`,
    155
  );
  const pageTitle = authorLine
    ? `${title} by ${authorLine} — Book details & where to buy | ${SITE_NAME}`
    : `${title} — Book details & where to buy | ${SITE_NAME}`;

  // Link the author to the matching catalog landing page when we have one.
  const authorEntry = authors
    .map((a) => AUTHORS.find((e) => slugify(e.name) === slugify(a)))
    .find(Boolean);

  const facts = [];
  if (book.firstPublishYear) facts.push(`<li><b>First published:</b> ${escapeHtml(book.firstPublishYear)}</li>`);
  if (book.publisher) facts.push(`<li><b>Publisher:</b> ${escapeHtml(book.publisher)}</li>`);
  if (book.pageCount) facts.push(`<li><b>Pages:</b> ${escapeHtml(book.pageCount)}</li>`);
  if (book.isbn) facts.push(`<li><b>ISBN:</b> ${escapeHtml(book.isbn)}</li>`);
  if (book.language) facts.push(`<li><b>Language:</b> ${escapeHtml(String(book.language).toUpperCase())}</li>`);

  const priceHtml =
    book.price != null
      ? `<p class="price">${escapeHtml(currencySymbol(book.currencyCode))}${Number(book.price).toFixed(2)} <span>list price</span></p>`
      : "";

  const cta = book.amazonLink
    ? `<a class="cta" href="${escapeHtml(book.amazonLink)}" rel="nofollow sponsored noopener noreferrer" target="_blank">Check price on Amazon →</a>`
    : "";
  const searchCta = `<a class="cta alt" href="${SITE_URL}/search?q=${encodeURIComponent(title)}">Find similar books</a>`;

  const storeLabel = market === "us" ? "Amazon.com" : "Amazon.de";

  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "Book",
      name: title,
      author: authors.map((a) => ({ "@type": "Person", name: a })),
      image: cover || undefined,
      isbn: book.isbn || undefined,
      numberOfPages: book.pageCount || undefined,
      datePublished: book.firstPublishYear ? String(book.firstPublishYear) : undefined,
      publisher: book.publisher ? { "@type": "Organization", name: book.publisher } : undefined,
      inLanguage: book.language || undefined,
      url: canonical,
      sameAs: book.canonicalVolumeLink || undefined,
      description: desc ? truncateText(desc, 400) : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Browse", item: `${SITE_URL}/seo` },
        { "@type": "ListItem", position: 3, name: title, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  const relatedHtml = related.length
    ? `<section class="related">
    <h2>${authorLine ? `More by ${escapeHtml(authorLine)}` : "Readers also viewed"}</h2>
    <div class="grid">${related
      .map(
        (b) => `
      <article class="minibook">
        ${b.coverImage ? `<img src="${escapeHtml(httpsify(b.coverImage))}" alt="${escapeHtml(b.title)} cover" loading="lazy" width="64" height="96">` : `<img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" width="64" height="96">`}
        <div>
          <p class="t"><a href="${bookDetailUrl(b.id)}">${escapeHtml(b.title)}</a></p>
          ${b.authors?.length ? `<p class="a">by ${(b.authors || []).map(escapeHtml).join(", ")}</p>` : ""}
          ${b.firstPublishYear ? `<p class="y">${escapeHtml(b.firstPublishYear)}</p>` : ""}
        </div>
      </article>`
      )
      .join("")}</div>
  </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="${book.language === "de" ? "de" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="book">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(metaDesc)}">
  <meta property="og:url" content="${canonical}">
  ${cover ? `<meta property="og:image" content="${escapeHtml(cover)}">` : ""}
  ${authorLine ? `<meta property="book:author" content="${escapeHtml(authorLine)}">` : ""}
  ${book.isbn ? `<meta property="book:isbn" content="${escapeHtml(book.isbn)}">` : ""}
  <meta name="twitter:card" content="${cover ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
  ${cover ? `<meta name="twitter:image" content="${escapeHtml(cover)}">` : ""}
  <style>${BOOK_STYLE}</style>
  <script type="application/ld+json">${escapeJson(structured)}</script>
</head>
<body>
  <header class="site">
    <div class="wrap">
      <a class="brand" href="${SITE_URL}/">${SITE_NAME}</a>
      <nav>
        <a href="${SITE_URL}/search">Search</a>
        <a href="${SITE_URL}/category">Genres</a>
        <a href="${SITE_URL}/seo">Browse</a>
      </nav>
    </div>
  </header>
  <main>
    <nav class="crumbs"><a href="${SITE_URL}/">Home</a> › <a href="${SITE_URL}/seo">Browse</a> › ${escapeHtml(title)}</nav>
    <div class="head">
      <div class="cover">${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(title)} cover" width="200" height="300">` : `<div class="nophoto">No cover</div>`}</div>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p class="byline">${authorEntry ? `by <a href="${pageUrl("author", authorEntry.slug)}">${escapeHtml(authorLine)}</a>` : authorLine ? `by ${escapeHtml(authorLine)}` : ""}</p>
        ${facts.length ? `<ul class="facts">${facts.join("")}</ul>` : ""}
        ${priceHtml}
        ${cta}${searchCta}
      </div>
    </div>
    ${
      desc
        ? `<section class="desc">
      <h2>About this book</h2>
      <p>${escapeHtml(truncateText(desc, 1200))}</p>
    </section>`
        : ""
    }
    ${relatedHtml}
    <section class="related">
      <h2>Where to buy</h2>
      <p>${book.amazonLink ? `This title is available via our affiliate partner ${storeLabel}. Prices and availability are set by the retailer.` : `Look this title up on ${storeLabel} or search BookPath for similar books.`}</p>
    </section>
  </main>
  <footer>
    © ${new Date().getFullYear()} ${SITE_NAME}. Some links are affiliate links and may earn us a commission. <a href="${SITE_URL}/affiliate-disclosure">Affiliate disclosure</a> · <a href="${SITE_URL}/sitemap.xml">Sitemap</a>
  </footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Sitemap + robots
// ---------------------------------------------------------------------------
export function renderSitemapXml(bookUrls = []) {
  const urls = [];
  const push = (type, slug, prio) => {
    urls.push(
      `  <url><loc>${pageUrl(type, slug)}</loc><changefreq>weekly</changefreq><priority>${prio}</priority></url>`
    );
  };
  GENRES.forEach((g) => push("genre", g.slug, "0.8"));
  TOPICS.forEach((t) => push("topic", t.slug, "0.6"));
  AUTHORS.forEach((a) => push("author", a.slug, "0.6"));

  const bookEntries = (bookUrls || [])
    .map((id) => `  <url><loc>${bookDetailUrl(id)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE_URL}/seo</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${SITE_URL}/about</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE_URL}/privacy</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE_URL}/terms</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>${SITE_URL}/affiliate-disclosure</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
${urls.join("\n")}${bookEntries ? `\n${bookEntries}` : ""}
</urlset>`;
}

export function renderRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}
