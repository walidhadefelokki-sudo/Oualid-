import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { getGoogleOAuthConfig } from "./oauth";
import { GoogleIdentity } from "../services/oauth.service";

/**
 * Registers the Google strategy, if it is configured.
 *
 * Passport is used only to perform the OAuth handshake — no sessions, no
 * serializeUser. The application's authentication remains its own JWT; the
 * strategy's job ends the moment it hands back a verified profile, which the
 * callback controller exchanges for that JWT.
 *
 * Returns false when Google is not configured, so the routes can respond with
 * a clear message instead of passport throwing "Unknown strategy".
 */
export function configureGoogleStrategy(): boolean {
  const config = getGoogleOAuthConfig();

  if (!config) {
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackUrl,
        // Only what is needed to identify the person (§10). No Drive, Gmail,
        // Contacts or Calendar.
        scope: ["profile", "email"],
      },
      (_accessToken, _refreshToken, profile: Profile, done) => {
        // Deliberately ignores the access and refresh tokens: this app never
        // calls Google APIs on the user's behalf, so storing them would be
        // holding a credential with no purpose.
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(null, false, {
              message: "Google did not provide an email address for this account.",
            });
          }

          // `verified` is Google's own claim about the address. Trusting an
          // unverified one would let someone link to an account they do not own.
          const emailVerified = profile.emails?.[0]?.verified === true ||
            (profile as { _json?: { email_verified?: boolean } })._json?.email_verified === true;

          const identity: GoogleIdentity = {
            providerAccountId: profile.id,
            email: email.toLowerCase(),
            emailVerified,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            picture: profile.photos?.[0]?.value,
          };

          // Passport types this slot as the application's authenticated user,
          // because the usual pattern resolves the account inside the verify
          // callback. Here the strategy stops at "this is who Google says it
          // is" and the controller does the lookup, so what travels through is
          // a provider identity, not a User. The cast records that difference.
          return done(null, identity as unknown as Express.User);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  return true;
}

export default passport;
