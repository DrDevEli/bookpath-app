// Must be first to load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Core modules
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// Express & Middleware
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import session from 'express-session';
import flash from 'connect-flash';
import helmet from 'helmet';

// Auth and Models
import passport from './config/passport.js';
import rateLimiterMiddleware from './middleware/rateLimiter.js';
import User from './models/User.js';
import { Book, Wishlist, Order } from './models/index.js';

// Routes
import bookRoutes from './routes/bookRoutes.js';
import userRoutes from './routes/userRoutes.js';

// MongoDB
import mongoose from 'mongoose';


const app = express();
const PORT = process.env.PORT || 3323;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Get the directory name in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware setup
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: NODE_ENV === 'production' },
}));

// Flash messages
app.use(flash());

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// View engine setup
app.set('views', path.join(process.cwd(), 'views'));
app.set('view engine', 'ejs');

// Global locals
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Security Headers
app.use(helmet.hsts({
  maxAge: 63072000,
  includeSubDomains: true,
  preload: true,
}));

// Rate limiter
app.use('/api/', rateLimiterMiddleware);

// Route handlers
app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);

// Error handler placeholder
import errorHandler from './middleware/errorHandler.js';
app.use(errorHandler);

if (NODE_ENV === 'production') {
  // HTTPS Configuration
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'config/ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'config/ssl/cert.pem')),
  };

  // Redirect all HTTP to HTTPS
  const httpApp = express();
  httpApp.all('*', (req, res) => {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  });
  httpApp.listen(80, () => console.log('🌐 HTTP -> HTTPS redirect running on port 80'));

  // Launch secure server
  const httpsServer = https.createServer(sslOptions, app);
  httpsServer.listen(443, () => console.log('🔐 Secure HTTPS server running on port 443'));

} else {
  // Development mode
  app.listen(PORT, () => console.log(`🛠️ Dev server running on http://localhost:${PORT}`));
}
