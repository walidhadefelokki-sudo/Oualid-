/**
 * Single source of the JWT signing secret.
 *
 * Previously both the signer and the verifier fell back to the literal
 * "fallback_secret" when JWT_SECRET was unset. That fails *open*: on any
 * environment missing the variable, every token is signed with a value
 * published in this repository, so anyone could mint a token for any user
 * and any role. Fail closed instead.
 *
 * Development keeps a fallback so a fresh clone runs without setup, but it
 * warns loudly and the value is generated per process — tokens do not
 * survive a restart, which makes the misconfiguration obvious immediately
 * rather than silently insecure.
 */
import crypto from "crypto";

let devSecret: string | null = null;

export function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET;

  if (configured && configured.trim().length > 0) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not set. Refusing to sign or verify tokens with a " +
        "default secret in production — set JWT_SECRET in the environment."
    );
  }

  if (!devSecret) {
    devSecret = crypto.randomBytes(48).toString("hex");
    console.warn(
      "⚠️  JWT_SECRET is not set. Using a random per-process secret for " +
        "development — every restart invalidates existing sessions. Set " +
        "JWT_SECRET in your .env to keep sessions across restarts."
    );
  }

  return devSecret;
}
