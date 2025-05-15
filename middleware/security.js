import helmet from 'helmet';

export default function securityMiddleware(app) {
  // Use Helmet to set a bunch of safe default headers
  app.use(helmet());

  // Additional/override headers
  app.use((req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Content Security Policy (CSP)
    // Adjust to your app's needs, especially if you use inline scripts or external sources
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';"
    );

    next();
  });
}
