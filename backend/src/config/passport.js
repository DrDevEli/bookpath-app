import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "../models/User.js";
import {
  recordFailedLogin,
  clearFailedLogins,
  isJwtBlacklisted,
} from "../utils/authRedisUtils.js";

// Local strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email", // Can accept email or username
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, identifier, password, done) => {
      try {
        // Determine if identifier is email or username
        const isEmail = identifier.includes('@');
        const user = await User.findOne(
          isEmail ? { email: identifier.toLowerCase() } : { username: identifier }
        ).select("+password");

        if (!user)
          return done(null, false, { message: "Incorrect email/username or password" });

        if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
          return done(null, false, {
            message: `Account locked until ${user.accountLockedUntil.toISOString()}`,
          });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          // Count ONLY real failures with client IP; cross-IP attempts cannot
          // hard-lock a victim's account (audit L1).
          await recordFailedLogin(identifier, req.ip);
          return done(null, false, { message: "Incorrect email/username or password" });
        }

        // Successful login resets attempts (clear both email and username)
        await clearFailedLogins(identifier);
        await clearFailedLogins(user.email);
        await clearFailedLogins(user.username);

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// JWT strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || "default",
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      passReqToCallback: true,
    },
    async (req, payload, done) => {
      try {
        if (await isJwtBlacklisted(payload.jti)) {
          return done(null, false, { message: "Token revoked" });
        }

        const user = await User.findById(payload.sub).select(
          "+tokenVersion accountLockedUntil"
        );
        if (!user) return done(null, false, { message: "User not found" });

        if (user.tokenVersion !== payload.tokenVersion) {
          return done(null, false, { message: "Token is outdated or invalid" });
        }

        if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
          return done(null, false, {
            message: "Account is temporarily locked",
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

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
