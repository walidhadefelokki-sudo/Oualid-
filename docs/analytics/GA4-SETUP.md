# Google Analytics 4 — setup

The code is in place and does nothing until step 2 is finished. Work through
these in order; each one is in the Google Analytics or Vercel interface, not
in the repository.

Read **step 3** before turning Enhanced Measurement on. One of its sub-options
double-counts every page view on this site.

---

## 1. Create the property and get the measurement ID

1. Go to **analytics.google.com** and sign in with the account that should own
   the data. Use a company account, not a personal one — moving a property
   between accounts later is awkward.
2. **Admin** (the gear, bottom left) → **Create** → **Property**.
3. Fill in:
   - Property name: `Dar L'emploi`
   - Reporting time zone: **(GMT+01:00) Algeria**
   - Currency: **Algerian Dinar (DZD)**

   The time zone decides where a "day" starts. Getting it wrong shifts every
   daily traffic figure your partner asked for.
4. Business details and objectives: answer honestly; they only change which
   reports are suggested.
5. **Create**, accept the terms.
6. On **Start collecting data**, choose **Web**.
7. Data stream:
   - Website URL: `https://www.darlemploi.dz`
   - Stream name: `Site principal`
8. **Create stream**. The **Measurement ID** appears top right, in the form
   `G-XXXXXXXXXX`. Copy it.

Ignore the installation instructions Google shows. The tag is already in the
code; it is waiting for that ID.

---

## 2. Put the ID in Vercel and redeploy

1. Vercel → the project → **Settings** → **Environment Variables**.
2. Add:
   - Key: `VITE_GA_MEASUREMENT_ID`
   - Value: the `G-XXXXXXXXXX` from step 1
   - Environments: **Production** (add Preview too if you want staging data in
     the same property — most people do not)
3. **Save**.
4. **Deployments** → the latest one → **⋯** → **Redeploy**.

**The redeploy is not optional.** `VITE_` variables are read when the bundle
is built, not when the page loads, so the running deployment will keep
behaving as though analytics were switched off until it is rebuilt.

### What changes on the site at this moment

The cookie banner stops saying "no analytics cookies" and starts offering
**Accepter / Refuser**. Nothing is tracked for anyone who refuses, or for
anyone who has not yet chosen.

---

## 3. Enhanced Measurement — with one option turned off

**Admin** → **Data streams** → your stream → **Enhanced measurement**.

Leave it **on**, then open its settings (the gear beside the toggle) and:

| Option | Set to | Why |
|---|---|---|
| Page views | **on** | |
| **Page changes based on browser history events** | **OFF** | see below |
| Scrolls | on | |
| Outbound clicks | on | |
| Site search | on | |
| Video engagement | on | |
| File downloads | on | |
| Form interactions | on | |

**Why that one is off.** Both applications are single-page: a navigation
changes the URL through the History API without loading a document. The code
already reports each of those as a page view, with the right path. If Google
also reports them, every page view on the site is counted twice — and a
doubled figure looks plausible, so nobody notices.

Turn that single sub-option off and the count is right. Everything else in
Enhanced Measurement is safe to enable, which is what your partner asked for.

---

## 4. Google Signals, demographics, retention

**Admin** → **Data collection and modification** → **Data collection**.

- **Google signals data collection** → turn on.
- **Demographics and interests** → turn on (it comes with Signals).

**Read this before enabling Signals.** It shares user data with Google for
advertising and cross-device reporting. That is a change to what the platform
does with personal data, and the privacy policy has to say so. With 357 real
accounts on the platform, confirm with whoever owns the legal text first.
Everything else in this document works without it.

Then **Admin** → **Data collection and modification** → **Data retention**:

- Event data retention: change **2 months** → **14 months**
- Reset user data on new activity: on

14 months is the maximum GA4 allows on the free tier and the only way to
compare a month against the same month last year.

---

## 5. Mark the key events as conversions

**Admin** → **Events** → **Key events** → **Create key event**, then type each
name exactly:

| Event | Means |
|---|---|
| `sign_up` | an account was created |
| `application_sent` | a candidate applied to an offer |
| `job_published` | a recruiter published an offer |
| `payment_confirmed` | a payment completed |
| `service_published` | a freelancer published a service |
| `proposal_sent` | a freelancer answered a project |
| `subscription_activated` | a plan started |

Create them by name rather than waiting for them in the event list: an event
only appears there after it has been received at least once, and several of
these will not fire until the marketplace has users.

Exact spelling matters. A mistyped name silently becomes a different,
permanently empty metric.

---

## 6. Check it works

1. Open `https://www.darlemploi.dz` in a private window.
2. **Accept** on the cookie banner — nothing is sent until you do.
3. In GA4: **Reports** → **Realtime**. You should appear within about thirty
   seconds.
4. Move between pages and watch the page-view count rise by one per
   navigation. **If it rises by two, step 3 was not applied.**
5. Create a test account to confirm `sign_up` arrives.

Then open a second private window, choose **Refuser**, and browse. Realtime
should not move. That is the part worth testing, because it is the part a
regulator would ask about.

---

## What is already in the code

- `src/analytics.ts` — loading, consent, page views, event names
- `src/components/CookieNotice.tsx` — the banner and the policy, which change
  according to whether a measurement ID exists
- `src/freelance/usePageViews.ts` — marketplace route changes
- `src/App.tsx` — recruitment view changes

Event names live in `EVENTS` in `src/analytics.ts`. Add new ones there rather
than passing strings at the call site.
