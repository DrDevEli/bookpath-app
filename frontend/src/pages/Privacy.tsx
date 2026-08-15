import React from 'react';

export function Privacy() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-[rgb(30,41,59)]">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: August 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Who we are</h2>
        <p>
          BookPath ("we", "us") operates the website bookpath.org. We respect your
          privacy and process personal data in accordance with the EU General Data
          Protection Regulation (GDPR).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Data we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Email address</strong> — only if you subscribe to our deals list or
            create an account. You can unsubscribe or delete your data at any time.
          </li>
          <li>
            <strong>Account & library data</strong> — if you register, we store your
            username, a hashed password, and the books you save to your library.
          </li>
          <li>
            <strong>Usage analytics</strong> — anonymized, aggregated events such as
            searches and link clicks, used to improve the site.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Third parties</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Google Books API</strong> — supplies book metadata for search.</li>
          <li><strong>Amazon</strong> — processes purchases you make after clicking an affiliate link.</li>
          <li><strong>Email provider</strong> — delivers our opt-in emails.</li>
          <li><strong>OpenAI</strong> — powers book recommendations (book titles only).</li>
        </ul>
        <p>
          These services are governed by their own privacy policies. When you click an
          affiliate link, you leave BookPath and are subject to Amazon's policies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Cookies & local storage</h2>
        <p>
          BookPath uses browser local storage for essential functions (authentication
          token, saved preferences). We do not run third-party advertising trackers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Your rights</h2>
        <p>
          Under GDPR you have the right to access, correct, export, and delete your
          personal data, and to withdraw consent at any time. To exercise any of these
          rights, contact us at <a className="underline" href="mailto:privacy@bookpath.org">privacy@bookpath.org</a>.
        </p>
      </section>
    </div>
  );
}

export default Privacy;
