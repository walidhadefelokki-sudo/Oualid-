/**
 * Google Analytics 4.
 *
 * Two conditions, both required, before a single request leaves the browser:
 * a measurement id must be configured, and the visitor must have accepted
 * analytics cookies. Neither is assumed — with no id this module does
 * nothing at all, which is what should happen in development and in any
 * deployment where analytics was not set up.
 *
 * Consent is not a banner that records a click and loads the tag anyway.
 * Under Algerian Law 18-07 analytics cookies need a real choice made before
 * they are set, so the script tag is injected on acceptance and never
 * injected otherwise. Refusing is a state we store and honour, not a dialog
 * we dismiss.
 *
 * Events are queued until the tag is ready, so a page view fired during
 * startup is not lost to a race with the script load.
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

export const CONSENT_KEY = "analyticsConsent";
export const CONSENT_EVENT = "dl:analytics-consent";

export type Consent = "granted" | "denied" | "unset";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Nothing is tracked unless an id was configured at build time. */
export const isConfigured = (): boolean => Boolean(MEASUREMENT_ID);

export const readConsent = (): Consent => {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    // Private windows and blocked storage throw. An unreadable preference is
    // not consent.
    return "unset";
  }
};

let loaded = false;
/** Events fired before the tag finished loading. */
const pending: Array<unknown[]> = [];

const push = (...args: unknown[]) => {
  if (window.gtag) window.gtag(...args);
  else pending.push(args);
};

/**
 * Injects the GA4 tag. Called only from `grantConsent`, never on startup.
 */
const load = () => {
  if (loaded || !MEASUREMENT_ID) return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    // Sent explicitly on navigation instead: both applications are single
    // page, so the automatic one would only ever report the entry URL.
    send_page_view: false,
    anonymize_ip: true,
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);

  for (const args of pending.splice(0)) window.gtag(...args);
};

/** Accepting loads the tag; it is the only thing that does. */
export const grantConsent = () => {
  try {
    localStorage.setItem(CONSENT_KEY, "granted");
  } catch {
    /* Honoured for this session even if it cannot be stored. */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: "granted" }));
  load();
};

/**
 * Refusing is recorded and acted on.
 *
 * The tag cannot be unloaded once injected, so refusal after acceptance also
 * sets GA's own opt-out flag, which stops it sending anything further.
 */
export const denyConsent = () => {
  try {
    localStorage.setItem(CONSENT_KEY, "denied");
  } catch {
    /* ignore */
  }
  if (MEASUREMENT_ID) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${MEASUREMENT_ID}`] = true;
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: "denied" }));
};

/** Re-loads the tag on a return visit where consent was already given. */
export const initAnalytics = () => {
  if (!MEASUREMENT_ID) return;
  if (readConsent() === "granted") load();
  if (readConsent() === "denied") {
    (window as unknown as Record<string, unknown>)[`ga-disable-${MEASUREMENT_ID}`] = true;
  }
};

/**
 * A page view.
 *
 * `title` is passed rather than read from document.title, which in a single
 * page application still holds the previous screen's title at the moment a
 * navigation happens.
 */
export const trackPageView = (path: string, title?: string) => {
  if (!MEASUREMENT_ID || readConsent() !== "granted") return;
  push("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
    ...(title ? { page_title: title } : {}),
  });
};

/**
 * The events the KPIs are built from.
 *
 * Named here rather than passed as free strings at each call site: a typo in
 * an event name produces a second metric that looks real and is not, and
 * nothing in GA4 will point it out.
 */
export const EVENTS = {
  signUp: "sign_up",
  signIn: "login",
  cvUploaded: "cv_uploaded",
  cvBuilt: "cv_built",
  applicationSent: "application_sent",
  jobPublished: "job_published",
  searchPerformed: "search",
  serviceViewed: "service_viewed",
  servicePublished: "service_published",
  proposalSent: "proposal_sent",
  projectPublished: "project_published",
  creditsPurchaseStarted: "credits_purchase_started",
  paymentConfirmed: "payment_confirmed",
  subscriptionActivated: "subscription_activated",
  portfolioViewed: "portfolio_viewed",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * Records one event.
 *
 * Never pass anything that identifies a person: no e-mail, no name, no CV
 * contents, no message text. Google's terms forbid it and Law 18-07 is
 * stricter still. Parameters here describe *what happened*, not *to whom*.
 */
export const trackEvent = (name: EventName, params: Record<string, string | number | boolean> = {}) => {
  if (!MEASUREMENT_ID || readConsent() !== "granted") return;
  push("event", name, params);
};
