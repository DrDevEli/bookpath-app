import React from 'react';

export function Terms() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-[rgb(30,41,59)]">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: August 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Acceptance of terms</h2>
        <p>
          By accessing or using bookpath.org, you agree to these terms. If you do not
          agree, please do not use the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. The service</h2>
        <p>
          BookPath provides book discovery, search, and personal library tools. The
          service is provided "as is" and we make no warranty that it will be
          uninterrupted or error-free.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Affiliate links & purchases</h2>
        <p>
          BookPath contains affiliate links to third-party retailers. Any purchase you
          make occurs on the retailer's site and is governed by their terms. We are not
          a party to those transactions and are not responsible for the retailer's
          products, pricing, or service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Your account</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account
          credentials and for all activity under your account. We may suspend accounts
          that violate these terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Intellectual property</h2>
        <p>
          Book content, covers, and descriptions belong to their respective rightsholders
          and are used for informational purposes. The BookPath name, logo, and original
          site content are our property.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, BookPath shall not be liable for any
          indirect, incidental, or consequential damages arising from your use of the
          service.
        </p>
      </section>
    </div>
  );
}

export default Terms;
