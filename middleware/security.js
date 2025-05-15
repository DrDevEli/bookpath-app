import helmet from 'helmet';

export default function securityMiddleware(app) {
  app.use(helmet());
  
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'"
    );
    next();
  });
}
