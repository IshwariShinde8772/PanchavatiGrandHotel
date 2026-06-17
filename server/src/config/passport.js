const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const env = require("./env");
const { Customer } = require("../../models");

function getOauthBackendBaseUrl() {
  return String(env.backendUrl || "")
    .trim()
    .replace(/\/+$/g, "")
    .replace(/\/api$/i, "");
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const customer = await Customer.findByPk(id);
    done(null, customer);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy
if (env.google.clientId && env.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: `${getOauthBackendBaseUrl()}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find or create customer based on Google profile
          const [customer] = await Customer.findOrCreate({
            where: { email: profile.emails[0].value },
            defaults: {
              full_name: profile.displayName,
              email: profile.emails[0].value,
              password_hash: null, // Social login users don't need passwords
              otp_verified: true,
              avatar_url: profile.photos[0]?.value,
            },
          });

          return done(null, customer);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

module.exports = passport;
