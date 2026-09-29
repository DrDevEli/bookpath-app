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
 * Only lists whose contents were READ card by card (catalog-quality/
 * list-inspect.py or studio/catalog_probe.py) — never lists whose names merely
 * sound right. Filling 12 cards is not evidence of quality: the 2026-09-29
 * ranker pass filled the business, self-help, memoir and classics lists with
 * 12 cards each and they are still books ABOUT their subject — strategy
 * textbooks, government reports, "Self-Help Books" by Sandra Dolby, "Starting
 * and Operating a Business in Indiana", "Women in Rock Memoirs" (an academic
 * study), "Imagery from Genesis in Holocaust Memoirs" (a monograph).
 *
 * Verified GOOD as of 2026-09-29 (read card by card):
 *   genre/romance                 Hoover, Garwood, Steel, Glines, Lindsey, Deveraux
 *   topic/contemporary-fiction    Wolf Hall, Shuggie Bain, The White Tiger, Possession
 *   genre/science-fiction         Solaris, A Canticle for Leibowitz, The Giver, 1984
 *   genre/mystery, genre/fantasy, topic/cozy-mysteries, topic/psychological-thrillers
 *     — read on 2026-09-29 before the carousel/Reel batch was generated
 *
 * NOT good enough, deliberately absent (do not re-add without re-reading them):
 *   genre/self-help, genre/business, topic/best-business-books   (books about business)
 *   topic/best-memoirs                                            (mostly academic)
 *   topic/classic-literature                                      (5 of 12 usable)
 *   topic/best-novels-of-all-time                                 (duplicate of contemporary-fiction)
 *
 * `type` must match the catalog: genre | topic | author (see
 * backend/src/data/seoCatalog.js). A wrong type or slug is a 404 for a reader who
 * arrived from a post.
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
    title: "Fiction to get lost in",
    intro: "Real commercial fiction — the lists we could hand to someone without a caveat.",
    lists: [
      { type: "genre", slug: "romance", label: "Romance", hook: "Hoover, Garwood, Steel, Lindsey — the list we trust most." },
      { type: "genre", slug: "mystery", label: "Mystery & crime", hook: "Christie to Mankell, without the self-published filler." },
      { type: "genre", slug: "fantasy", label: "Fantasy", hook: "Tolkien, Le Guin, Earthsea — actual fantasy novels." },
      { type: "topic", slug: "cozy-mysteries", label: "Cozy mysteries", hook: "Capped at two books per author, so one writer can't take the shelf." },
      { type: "topic", slug: "psychological-thrillers", label: "Psychological thrillers", hook: "Twisty, contemporary, mostly trad-published." },
    ],
  },
  {
    id: "prize",
    title: "Prize winners and other worlds",
    intro: "Two lists we read line by line before putting them here.",
    lists: [
      { type: "topic", slug: "contemporary-fiction", label: "Booker Prize winners", hook: "Wolf Hall, Shuggie Bain, The White Tiger, Possession. The strongest list on the site." },
      { type: "genre", slug: "science-fiction", label: "Science fiction", hook: "Solaris, A Canticle for Leibowitz, The Giver, Nineteen Eighty-Four." },
    ],
  },
];

export const TOTAL_CURATED = CURATED_PATHS.reduce((n, p) => n + p.lists.length, 0);

/** Shown under the paths, so the page states its own limits instead of implying
 *  every one of the site's 150+ lists is this good. */
export const REBUILD_NOTE =
  "The non-fiction lists (business, self-help, memoirs, classics) are being rebuilt. " +
  "Their first version served textbooks and monographs about their subject rather than " +
  "books in it — so they are not on this page until they pass a read-through.";
