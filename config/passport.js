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
        // 1. Find user by email
        const user = await User.findOne({ email });

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
