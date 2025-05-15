
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../models/User.js';
import {
  incrementLoginAttempts,
  clearLoginAttempts,
  lockUserAccount,
  isJwtBlacklisted
} from '../utils/authRedisUtils.js';

// Local strategy
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) return done(null, false, { message: 'Incorrect email or password' });

      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        return done(null, false, { message: `Account locked until ${user.accountLockedUntil.toISOString()}` });
      }

      const attempts = await incrementLoginAttempts(email);

      if (attempts >= 5) {
        const lockUntil = await lockUserAccount(user._id);
        return done(null, false, { message: `Too many attempts. Account locked until ${lockUntil.toISOString()}` });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return done(null, false, { message: 'Incorrect email or password' });

      // Successful login resets attempts
      await clearLoginAttempts(email);

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// JWT strategy
passport.use(new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    passReqToCallback: true
  },
  async (req, payload, done) => {
    try {
      if (await isJwtBlacklisted(payload.jti)) {
        return done(null, false, { message: 'Token revoked' });
      }

      const user = await User.findById(payload.sub).select('+tokenVersion accountLockedUntil');
      if (!user) return done(null, false, { message: 'User not found' });

      if (user.tokenVersion !== payload.tokenVersion) {
        return done(null, false, { message: 'Token is outdated or invalid' });
      }

      if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
        return done(null, false, { message: 'Account is temporarily locked' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Session serialization
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;