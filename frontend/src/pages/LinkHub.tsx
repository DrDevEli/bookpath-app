import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CURATED_PATHS, REBUILD_NOTE, TOTAL_CURATED } from '../lib/curatedLists';
import { SubscribeCard } from '../components/SubscribeCard';

/**
 * /links — the hub the Instagram bio (and Story sticker) points at.
 *
 * WHY IT EXISTS: Instagram captions cannot carry a clickable link, so the bio
 * link is the only exit from the profile. Sending that click to the homepage
 * forces the reader to search for something they already saw in a post. This
 * page is the menu: one click from the bio to a specific list, carrying the
 * channel with it.
 *
 * ATTRIBUTION: the channel (instagram / pinterest / …) is read from the arrival
 * URL, remembered in a first-party cookie, and forwarded on every outbound link
 * as ?src=. The server-rendered list page reads that cookie when it builds its
 * Amazon CTA, so the eventual click is attributed to this channel and this list.
 * Without the cookie the trail dies the moment the reader leaves this page,
 * because the landing page itself is cached.
 */

const CHANNELS = ['instagram', 'pinterest', 'social', 'seo', 'email', 'link-hub', 'direct'];

function normalizeChannel(value: string | null): string | null {
  const v = (value || '').trim().toLowerCase();
  return CHANNELS.includes(v) ? v : null;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function resolveChannel(search: URLSearchParams): string {
  const fromQuery =
    normalizeChannel(search.get('src')) || normalizeChannel(search.get('utm_source'));
  if (fromQuery) {
    // 30 days, first party, readable by this origin only. The server sets the
    // same cookie on landing pages; this covers the SPA arrival path.
    document.cookie = `bp_src=${fromQuery}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax`;
    return fromQuery;
  }
  return normalizeChannel(readCookie('bp_src')) || 'direct';
}

export function LinkHub() {
  const [search] = useSearchParams();
  const channel = resolveChannel(search);

  // Record the arrival so "did the post send anyone" has a denominator on our
  // side of the fence. Fire-and-forget: a failed beacon must never affect the page.
  useEffect(() => {
    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: channel, context: 'link-hub' }),
      keepalive: true,
    }).catch(() => undefined);
  }, [channel]);

  return (
    <div className="max-w-4xl mx-auto space-y-10 text-[rgb(30,41,59)]">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Start here</h1>
        <p className="text-muted-foreground">
          {TOTAL_CURATED} lists, each one read through by hand before it was allowed on
          this page. Pick a direction — every list shows the real covers, blurbs and where
          to buy.
        </p>
        <p className="text-sm text-muted-foreground">
          BookPath has 150+ lists in total;{' '}
          <Link to="/seo" className="underline">
            browse them all
          </Link>
          . Links to books are affiliate links —{' '}
          <Link to="/affiliate-disclosure" className="underline">
            how that works
          </Link>
          .
        </p>
      </header>

      {CURATED_PATHS.map((path) => (
        <section key={path.id} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{path.title}</h2>
            <p className="text-sm text-muted-foreground">{path.intro}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {path.lists.map((list) => (
              <li key={`${list.type}-${list.slug}`}>
                <Link
                  to={`/books/${list.type}/${list.slug}?src=${channel}`}
                  className="block h-full rounded-lg border p-4 transition-colors hover:border-[rgb(30,41,59)]"
                >
                  <span className="font-semibold">{list.label} →</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{list.hook}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-lg border p-5 space-y-2">
        <h2 className="text-lg font-semibold">What is not here yet</h2>
        <p className="text-sm text-muted-foreground">{REBUILD_NOTE}</p>
      </section>

      {/* Capture AFTER the lists: the hub's job is to route to a list in one tap,
          so a form above them would compete with the primary path. */}
      <SubscribeCard source={channel} context="link-hub" />

      <section className="rounded-lg border p-5 space-y-2">
        <h2 className="text-lg font-semibold">Looking for something specific?</h2>
        <p className="text-sm text-muted-foreground">
          Search the full catalog by title, author or genre — or build a library of what
          you plan to read next.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link to="/search" className="font-semibold underline">
            Search all books →
          </Link>
          <Link to="/register" className="font-semibold underline">
            Create a free library →
          </Link>
        </div>
      </section>
    </div>
  );
}

export default LinkHub;
