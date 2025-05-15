import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/User.js';
import * as openpgp from 'openpgp';

 // Local Strategy for username/password authentication
 passport.use(new LocalStrategy(
    {
      usernameField: 'email', // Use email instead of username
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // Enhanced rate limiting
        if (user?.accountLockedUntil && user.accountLockedUntil > new Date()) {
          return done(null, false, { 
            message: `Account locked until ${user.accountLockedUntil.toISOString()}` 
          });
        }

        const attemptsKey = `login:${email}:${new Date().toISOString().slice(0,10)}`;
        const attempts = await redisClient.incr(attemptsKey);
        await redisClient.expire(attemptsKey, 86400); // 24h
        
        if (attempts >= 5) {
          await User.findByIdAndUpdate(user._id, {
            accountLockedUntil: new Date(Date.now() + 15*60*1000) // 15 min lock
          });
          return done(null, false, { message: 'Too many attempts. Account temporarily locked.' });
        }

        // 1. Find user by email
        const user = await User.findOne({ email }).select('+password');

        // 2. If user doesn't exist
        if (!user) {
          return done(null, false, { message: 'Incorrect email or password' });
        }

        // 3. Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect email or password' });
        }

        // 4. If everything is correct
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    passReqToCallback: true
  }, async (req, payload, done) => {
    try {
      // Check token in Redis blacklist
      const isBlacklisted = await redisClient.get(`jwt:blacklist:${payload.jti}`);
      if (isBlacklisted) {
        return done(null, false, { message: 'Token revoked' });
      }

      const user = await User.findById(payload.sub);
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  
export default passport;
