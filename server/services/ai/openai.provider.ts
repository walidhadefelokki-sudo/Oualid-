import { GoogleGenAI } from "@google/genai";
import { AppError } from "../../middleware/error.middleware";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

/**
 * The model every AI feature runs on — quiz generation, answer grading and
 * CV/job analysis.
 *
 * Overridable by environment because Google retires models on their own
 * schedule: a key issued after a retirement gets a 404 ("no longer available
 * to new users") rather than a graceful fallback, which is exactly how the
 * previous pin to gemini-2.5-flash broke. Setting GEMINI_MODEL fixes that
 * without a deploy.
 */
const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

/** Transient server-side conditions, as opposed to a bad request or bad key. */
const RETRYABLE = [429, 500, 502, 503, 504];

/**
 * Per-attempt and overall budgets.
 *
 * The whole call has to finish inside the function's 60-second ceiling
 * (vercel.json), and a request that dies at the platform boundary gives the
 * candidate a blank failure with nothing in the logs. Measured: a healthy call
 * is ~10s, but under load one took 20s+ and three unbounded attempts ran to
 * 69s. Capping each attempt keeps the worst case at roughly 3 x 15s + 3.5s of
 * backoff, comfortably inside the ceiling.
 */
const ATTEMPT_TIMEOUT_MS = 15_000;
const BACKOFF_MS = [1000, 2500];

const statusOf = (err: unknown): number | null => {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/"code"\s*:\s*(\d{3})/);
  return match ? Number(match[1]) : null;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class AttemptTimeout extends Error {}

/** Abandons a slow attempt so the retry budget stays predictable. */
const withTimeout = async <T>(work: Promise<T>, ms: number): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AttemptTimeout(`timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Sends one prompt, retrying briefly when the model is busy or slow.
 *
 * Gemini returns 503 "experiencing high demand" often enough that a single
 * attempt makes the feature feel broken — a candidate clicks Generate and gets
 * an error for a reason that has nothing to do with them. Two extra attempts
 * clear almost all of it.
 */
export async function askAI(prompt: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({ model: MODEL, contents: prompt }),
        ATTEMPT_TIMEOUT_MS
      );

      return response.text ?? "";
    } catch (err) {
      const timedOut = err instanceof AttemptTimeout;
      const status = statusOf(err);
      const canRetry = timedOut || (status !== null && RETRYABLE.includes(status));

      if (!canRetry) throw err;

      if (attempt >= BACKOFF_MS.length) {
        // Out of budget. A clear message beats the platform killing the
        // request with nothing to show for it.
        throw new AppError(
          "The AI service is busy right now. Please try again in a moment.",
          503
        );
      }

      console.warn(
        `Gemini ${timedOut ? "timeout" : status} on attempt ${attempt + 1}; retrying in ${BACKOFF_MS[attempt]}ms`
      );
      await wait(BACKOFF_MS[attempt]);
    }
  }
}
