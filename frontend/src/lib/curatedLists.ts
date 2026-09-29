/**
 * The curated set behind /links — the destination for the Instagram bio link.
 *
 * WHY THIS FILE EXISTS
 * Instagram captions carry no clickable links: the bio link and a Story sticker
 * are the only exits. So the bio link has to be the highest-converting page on
 * the site, and "send them to the homepage and hope they search" is a wasted
 * click. This is that page's content.
 *
 * WHAT BELONGS HERE
 * Only lists whose contents have been READ card by card (catalog-quality/
 * list-inspect.py) — not lists whose names merely sound right. A page filling
 * 12 cards is not proof the cards are worth posting: the junk ranker pass of
 * 2026-09-29 is what made these 13 usable, and the rest of the catalog is still
 * being rewritten. Anything added here must be read first, or this page becomes
 * the same liability the landing pages were.
 *
 * `type` must match the catalog: genre | topic | author (see
 * backend/src/data/seoCatalog.js). A wrong type or slug is a 404 for a reader
 * who came from a post.
 */

export type CuratedListType = "genre" | "topic" | "author";

export interface CuratedList {
  type: CuratedListType;
  slug: string;
  label: string;
  hook: string;
}

export interface CuratedPath {
  id: string;
  title: string;
  intro: string;
  lists: CuratedList[];
}

export const CURATED_PATHS: CuratedPath[] = [
  {
    id: "stories",
    title: "Stories worth losing a weekend to",
    intro: "Real commercial fiction — the lists we could hand to someone without a caveat.",
    lists: [
      { type: "genre", slug: "romance", label: "Romance", hook: "The list we trust most — big-name commercial romance." },
      { type: "genre", slug: "mystery", label: "Mystery & crime", hook: "Christie to Mankell, without the self-published filler." },
      { type: "genre", slug: "fantasy", label: "Fantasy", hook: "Tolkien, Le Guin, Earthsea — actual fantasy novels." },
      { type: "topic", slug: "cozy-mysteries", label: "Cozy mysteries", hook: "Capped at two books per author, so one writer can't take the shelf." },
      { type: "topic", slug: "psychological-thrillers", label: "Psychological thrillers", hook: "Twisty, contemporary, and mostly trad-published." },
    ],
  },
  {
    id: "money",
    title: "Think clearly about money and work",
    intro: "Business and self-help lists, rebuilt after the first versions served textbooks on the subject.",
    lists: [
      { type: "topic", slug: "best-business-books", label: "Best business books", hook: "Strategy and management from real trade publishers." },
      { type: "genre", slug: "business", label: "Business (BISAC subject)", hook: "Every title filed under Business & Economics — not written about it." },
      { type: "genre", slug: "self-help", label: "Self-help", hook: "Practical self-help. Two self-published habit books still slip through — we know." },
    ],
  },
  {
    id: "canon",
    title: "The canon, and how we got here",
    intro: "Novels, classics and history, plus the memoirs that survived the filter.",
    lists: [
      { type: "topic", slug: "contemporary-fiction", label: "Contemporary fiction", hook: "Booker Prize winners — the strongest list on the site." },
      { type: "topic", slug: "best-novels-of-all-time", label: "Novels of all time", hook: "Currently shares a source with contemporary fiction; being split." },
      { type: "topic", slug: "classic-literature", label: "Classic literature", hook: "Dover Thrift Editions — cheap, complete, no abridgements." },
      { type: "genre", slug: "science-fiction", label: "Science fiction", hook: "Real SF novels since the subject-quoting fix (Solaris, Canticle, Stand on Zanzibar)." },
      { type: "topic", slug: "best-memoirs", label: "Memoirs", hook: "Rebuilt after v1 served the Geological Survey of India." },
    ],
  },
];

export const TOTAL_CURATED = CURATED_PATHS.reduce((n, p) => n + p.lists.length, 0);
