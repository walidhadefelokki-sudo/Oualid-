import crypto from "crypto";
import axios from "axios";
import { AppError } from "../middleware/error.middleware";

/**
 * Chargily Pay v2.
 *
 * Two things here are deliberate and load-bearing:
 *
 * 1. Nothing in this file accepts a price from anywhere but its caller, and
 *    the only caller resolves the price from the server's own pack catalogue.
 *    The browser names a pack, never an amount.
 *
 * 2. Webhooks are verified before they are believed. The endpoint is public —
 *    it has to be, Chargily calls it — so without a signature check anyone who
 *    found the URL could POST {"type":"checkout.paid"} and help themselves to
 *    annonces.
 */

const MODE = (process.env.CHARGILY_MODE?.trim() || "test").toLowerCase();

/** Test and live are different base paths on the same host. */
const API_BASE =
  MODE === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";

const secretKey = () => {
  const key = process.env.CHARGILY_SECRET_KEY?.trim();
  if (!key) {
    throw new AppError(
      "Le paiement en ligne n'est pas configuré. Contactez le support.",
      503
    );
  }
  return key;
};

/**
 * Refuses to run with a key that does not belong to the mode.
 *
 * The two are set independently, so going live is two edits and it is easy to
 * make one of them. A live key against the test endpoint quietly takes no real
 * money; a test key against the live endpoint rejects every payment. Both look
 * like "payments are broken" rather than "the config is half-changed", so say
 * so at startup instead.
 */
const keyPrefix = process.env.CHARGILY_SECRET_KEY?.trim().slice(0, 8) ?? "";
if (keyPrefix) {
  const keyIsLive = keyPrefix.startsWith("live_");
  if (MODE === "live" && !keyIsLive) {
    console.error(
      "CHARGILY_MODE=live but CHARGILY_SECRET_KEY is a test key. Every payment will be rejected."
    );
  } else if (MODE !== "live" && keyIsLive) {
    console.error(
      "CHARGILY_SECRET_KEY is a LIVE key but CHARGILY_MODE is not live. Real cards will not be charged."
    );
  }
}

/** True when the integration is usable, for a health check or a UI hint. */
export const isChargilyConfigured = () => Boolean(process.env.CHARGILY_SECRET_KEY?.trim());

export const chargilyMode = () => MODE;

export interface CreateCheckoutInput {
  /** Whole dinars. Resolved server-side from the pack catalogue. */
  amount: number;
  successUrl: string;
  failureUrl: string;
  /** Echoed back on the webhook so the payment can be matched to its order. */
  metadata: Record<string, string>;
  /** Shown on the Chargily page. */
  description?: string;
  locale?: "ar" | "fr" | "en";
}

export interface ChargilyCheckout {
  id: string;
  url: string;
  amount: number;
  status: string;
}

export const createCheckout = async (
  input: CreateCheckoutInput
): Promise<ChargilyCheckout> => {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new AppError("Invalid amount.", 400);
  }

  try {
    const { data } = await axios.post(
      `${API_BASE}/checkouts`,
      {
        amount: input.amount,
        currency: "dzd",
        success_url: input.successUrl,
        failure_url: input.failureUrl,
        description: input.description,
        locale: input.locale ?? "fr",
        metadata: input.metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey()}`,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      }
    );

    if (!data?.id || !data?.checkout_url) {
      throw new AppError("Chargily returned an unexpected response.", 502);
    }

    return {
      id: data.id,
      url: data.checkout_url,
      amount: data.amount,
      status: data.status,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;

    // Log the provider's own message; show the customer something useful.
    const detail = err?.response?.data;
    console.error("Chargily checkout failed:", err?.response?.status, detail ?? err?.message);

    throw new AppError(
      "Impossible de créer le paiement. Réessayez dans un instant.",
      502
    );
  }
};

/**
 * Confirms a webhook really came from Chargily.
 *
 * The signature is an HMAC-SHA256 of the *raw* request body keyed with the
 * secret. It has to be the raw bytes — JSON.stringify of the parsed body
 * re-orders keys and drops whitespace, and the digest would never match.
 *
 * Compared with timingSafeEqual rather than ===, so the comparison cannot be
 * used as an oracle to guess a valid signature byte by byte.
 */
export const verifyWebhookSignature = (rawBody: Buffer | string, signature?: string): boolean => {
  if (!signature) return false;

  const key = process.env.CHARGILY_SECRET_KEY?.trim();
  if (!key) return false;

  const expected = crypto.createHmac("sha256", key).update(rawBody).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
};

/** Reads a checkout back from Chargily, to confirm state independently. */
export const retrieveCheckout = async (checkoutId: string) => {
  try {
    const { data } = await axios.get(`${API_BASE}/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${secretKey()}` },
      timeout: 15_000,
    });
    return data;
  } catch (err: any) {
    console.error("Chargily retrieve failed:", err?.response?.status, err?.response?.data);
    return null;
  }
};
