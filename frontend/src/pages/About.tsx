import React from 'react';

export function About() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-[rgb(30,41,59)]">
      <h1 className="text-3xl font-bold">About BookPath</h1>
      <p className="text-muted-foreground">
        BookPath is a book discovery platform that helps you find your next great read
        and organize your personal library.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What we do</h2>
        <p>
          We index a catalog of books across genres, topics and authors, so you can
          browse, search and discover titles you'll actually enjoy. You can build
          personal collections, get AI-powered recommendations, and see what other
          readers are checking out.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How we're funded</h2>
        <p>
          BookPath is free to use. When you click through to a retailer and make a
          purchase, we may earn a small affiliate commission at no extra cost to you.
          This is how the site stays free and ad-light. See our{' '}
          <a href="/affiliate-disclosure" className="underline">affiliate disclosure</a>{' '}
          for the full picture.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Our principles</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Honest book data — we show real list prices where available, never invented ones.</li>
          <li>Your library, your data — you can delete it any time.</li>
          <li>No spam — email is opt-in only and one-click unsubscribe.</li>
        </ul>
      </section>
    </div>
  );
}

export default About;
