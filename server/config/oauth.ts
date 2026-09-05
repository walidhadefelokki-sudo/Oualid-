import dotenv from "dotenv";

dotenv.config();

/**
 * Google OAuth configuration, read once and validated here rather than
 * scattered through the strategy and controllers.
 *
 * Nothing is hard-coded and nothing has a default that would silently work:
 * an unset variable disables Google sign-in and says so, instead of failing
 * later with an opaque redirect_uri_mismatch from Google.
 */
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

/** Where the browser is sent after the callback. Also the redirect allow-list. */
export const getFrontendUrl = (): string =>
  (process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5000").replace(/\/$/, "");

/**
 * Returns the Google config, or null when it is not fully set.
 *
 * Null rather than throwing: the rest of the API must keep working on a
 * deployment where Google sign-in has not been configured yet — only the
 * Google routes are disabled.
 */
export const getGoogleOAuthConfig = (): GoogleOAuthConfig | null => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL?.trim();

  if (!clientId || !clientSecret || !callbackUrl) {
    return null;
  }

  return { clientId, clientSecret, callbackUrl };
};

/** Why Google sign-in is unavailable, or null when it is configured. */
export const getGoogleConfigError = (): string | null => {
  const missing = (
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"] as const
  ).filter((key) => !process.env[key]?.trim());

  if (missing.length === 0) return null;

  return `Google sign-in is not configured: ${missing.join(", ")} ${
    missing.length === 1 ? "is" : "are"
  } not set.`;
};

export const isGoogleOAuthConfigured = (): boolean => getGoogleOAuthConfig() !== null;
