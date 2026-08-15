import React from 'react';

export function AffiliateDisclosure() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-[rgb(30,41,59)]">
      <h1 className="text-3xl font-bold">Affiliate Disclosure</h1>
      <p className="text-muted-foreground">Last updated: August 2026</p>

      <section className="space-y-3">
        <p>
          <strong>
            As an Amazon Associate, BookPath earns from qualifying purchases.
          </strong>
        </p>
        <p>
          BookPath participates in the Amazon Services LLC Associates Program (and its
          EU equivalents), an affiliate advertising program designed to provide a means
          for sites to earn advertising fees by linking to Amazon properties.
        </p>
        <p>
          This means that when you click a book link on BookPath and buy something on
          Amazon, we may earn a commission. This comes at no additional cost to you and
          never affects the price you pay.
        </p>
        <p>
          We only link to products we believe are relevant to the content on this site.
          Prices and availability shown are provided by Amazon and are subject to change
          at any time.
        </p>
      </section>
    </div>
  );
}

export default AffiliateDisclosure;
