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
 * Time budget for the whole call, including retries.
 *
 * Everything has to finish inside the function's 60-second ceiling
 * (vercel.json): a request killed at the platform boundary gives the candidate
 * a blank failure with nothing in the logs. Measured: a healthy call is ~10s,
 * a loaded one 20s+, and three unbounded attempts once ran to 69s.
 *
 * The budget is a deadline rather than a fixed attempt count, because the two
 * failure modes have opposite costs. A 503 fails almost instantly and leaves
 * nearly the whole budget for another try; a slow call consumes its cap and
 * leaves little. Tracking remaining time directly gets the most attempts out
 * of the budget in the first case without overrunning in the second — a fixed
 * 15s cap was aborting calls that would have succeeded.
 */
const TOTAL_BUDGET_MS = 50_000;
const MAX_ATTEMPT_MS = 24_000;
/** Not worth starting an attempt with less than this left. */
const MIN_ATTEMPT_MS = 6_000;

/**
 * A hard attempt cap on top of the time budget.
 *
 * Without it, a fast-failing status burns the whole budget on retries — an
 * observed run made twelve calls in thirty seconds against a 429. That is
 * worse than failing: hammering an endpoint that is already rate-limiting you
 * deepens the throttle and delays recovery for every other request.
 */
const MAX_ATTEMPTS = 4;

/**
 * Exponential, and much longer for 429.
 *
 * 503 means the model is momentarily busy and clears in a second or two. 429
 * means quota — retrying quickly cannot succeed and only adds load, so it
 * gets one slow retry rather than several fast ones.
 */
const BACKOFF_MS = [1000, 3000, 7000];
const RATE_LIMIT_BACKOFF_MS = 10_000;

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
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const remaining = () => deadline - Date.now();

  const exhausted = () =>
    new AppError(
      "The AI service is busy right now. Please try again in a moment.",
      503
    );

  for (let attempt = 0; ; attempt++) {
    const budget = Math.min(MAX_ATTEMPT_MS, remaining());
    if (budget < MIN_ATTEMPT_MS) throw exhausted();

    try {
      const response = await withTimeout(
        ai.models.generateContent({ model: MODEL, contents: prompt }),
        budget
      );

      return response.text ?? "";
    } catch (err) {
      const timedOut = err instanceof AttemptTimeout;
      const status = statusOf(err);

      // A bad key, a retired model or a malformed prompt will fail the same
      // way every time; only transient conditions are worth another attempt.
      if (!timedOut && !(status !== null && RETRYABLE.includes(status))) throw err;

      if (attempt + 1 >= MAX_ATTEMPTS) throw exhausted();

      const backoff =
        status === 429
          ? RATE_LIMIT_BACKOFF_MS
          : BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];

      if (remaining() - backoff < MIN_ATTEMPT_MS) throw exhausted();

      console.warn(
        `Gemini ${timedOut ? "timeout" : status} on attempt ${attempt + 1}; ` +
          `retrying in ${backoff}ms (${Math.round(remaining() / 1000)}s budget left)`
      );
      await wait(backoff);
    }
  }
}
